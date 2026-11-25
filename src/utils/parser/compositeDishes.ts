import { toSpaceKey } from './normalize'
import { matchQuantityAtStart } from './unitsAndQuantities'

interface CompositeRule {
  phrases: string[]
  buildSegments: (qty: number, trailingModifiers: string) => string[]
}

const COMPOSITE_IRANIAN_DISH_RULES: readonly CompositeRule[] = [
  {
    phrases: ['چلو کباب کوبیده', 'چلوکباب کوبیده', 'چلو کوبیده', 'چلوکوبیده'],
    buildSegments: (q, mod) => [
      `${q} پرس برنج آبکش${mod}`,
      `${q * 2} سیخ کباب کوبیده${mod}`,
    ],
  },
  {
    phrases: ['چلو جوجه کباب', 'چلوجوجه کباب', 'چلو جوجه', 'چلوجوجه'],
    buildSegments: (q, mod) => [`${q} پرس برنج آبکش${mod}`, `${q} سیخ جوجه کباب${mod}`],
  },
  {
    phrases: ['چلو کباب برگ', 'چلوکباب برگ'],
    buildSegments: (q, mod) => [`${q} پرس برنج آبکش${mod}`, `${q} سیخ کباب برگ${mod}`],
  },
  {
    phrases: ['چلو قورمه سبزی', 'چلو قرمه سبزی', 'چلوقورمه سبزی', 'چلوقورمه', 'چلو خورش قورمه سبزی'],
    buildSegments: (q, mod) => [
      `${q} پرس برنج آبکش${mod}`,
      `${Math.round(q * 1.5 * 10) / 10} کفگیر خورش قورمه‌سبزی${mod}`,
    ],
  },
  {
    phrases: ['چلو قیمه', 'چلوقیمه', 'چلو خورش قیمه'],
    buildSegments: (q, mod) => [
      `${q} پرس برنج آبکش${mod}`,
      `${Math.round(q * 1.5 * 10) / 10} کفگیر خورش قیمه${mod}`,
    ],
  },
  {
    phrases: ['چلو فسنجان', 'چلو فسنجون', 'چلوفسنجان', 'چلوفسنجون'],
    buildSegments: (q, mod) => [
      `${q} پرس برنج آبکش${mod}`,
      `${Math.round(q * 1.5 * 10) / 10} کفگیر خورش فسنجان${mod}`,
    ],
  },
  {
    phrases: ['نان و پنیر و گردو', 'نون و پنیر و گردو', 'نان پنیر گردو', 'نون پنیر گردو'],
    buildSegments: (q, mod) => [
      `${q} کف دست نان سنگک${mod}`,
      `${q} قوطی کبریت پنیر سفید${mod}`,
      `${q * 2} عدد گردو${mod}`,
    ],
  },
]

const OPTIONAL_COMPOSITE_UNITS = new Set(['پرس', 'بشقاب', 'دیس', 'لقمه', 'ساندویچ', 'عدد', 'تا'])

/**
 * Expands everyday compound Iranian meal orders (such as "یک پرس چلوکباب کوبیده" or
 * "نون و پنیر و گردو") into their constituent items so rice/bread + main dish are both tracked
 * and individually editable on QuickEntryBar chips.
 */
export function expandCompositeDishSegment(segment: string): string[] {
  const norm = toSpaceKey(segment)
  if (!norm) return [segment]

  const tokens = norm.split(' ').filter(Boolean)
  let idx = 0
  let qty = 1

  const qtyMatch = matchQuantityAtStart(tokens)
  if (qtyMatch) {
    qty = qtyMatch.quantity
    idx += qtyMatch.consumedTokens
  }

  if (idx < tokens.length && OPTIONAL_COMPOSITE_UNITS.has(tokens[idx])) {
    idx += 1
  }

  const remainder = tokens.slice(idx).join(' ')
  if (!remainder) return [segment]

  for (const rule of COMPOSITE_IRANIAN_DISH_RULES) {
    for (const phrase of rule.phrases) {
      const normPhrase = toSpaceKey(phrase)
      if (remainder === normPhrase || remainder.startsWith(`${normPhrase} `)) {
        const trailing = remainder.slice(normPhrase.length).trim()
        const modSuffix = trailing ? ` ${trailing}` : ''
        return rule.buildSegments(qty, modSuffix)
      }
    }
  }

  return [segment]
}
