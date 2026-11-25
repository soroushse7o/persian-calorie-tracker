export interface UnitDefinition {
  canonical: string
  synonyms: string[]
  fallbackGrams: number
}

export interface UnitPattern {
  canonical: string
  tokens: string[]
  compact: string
}

export interface QuantityMatch {
  quantity: number
  consumedTokens: number
  impliedUnit?: string
}

export interface UnitMatch {
  canonical: string
  consumedTokens: number
}

export const BUILTIN_UNITS: UnitDefinition[] = [
  {
    canonical: 'قاشق غذاخوری',
    synonyms: [
      'قاشق غذاخوری',
      'قاشق غذا خوری',
      'قاشق سوپخوری',
      'قاشق سوپ خوری',
      'قاشق بزرگ',
      'قاشق پر',
      'قاشق',
      'ق غ',
      'tbsp',
    ],
    fallbackGrams: 20,
  },
  {
    canonical: 'قاشق چای‌خوری',
    synonyms: [
      'قاشق چایخوری',
      'قاشق چای خوری',
      'قاشق مرباخوری',
      'قاشق مربا خوری',
      'قاشق کوچک',
      'قاشق کوچیک',
      'ق چ',
      'tsp',
    ],
    fallbackGrams: 6,
  },
  {
    canonical: 'کف دست',
    synonyms: ['کف دست', 'کفدست'],
    fallbackGrams: 30,
  },
  {
    canonical: 'قوطی کبریت',
    synonyms: ['قوطی کبریت', 'اندازه قوطی کبریت'],
    fallbackGrams: 30,
  },
  {
    canonical: 'کفگیر',
    synonyms: ['کفگیر', 'کف گیر'],
    fallbackGrams: 110,
  },
  {
    canonical: 'ملاقه',
    synonyms: ['ملاقه'],
    fallbackGrams: 140,
  },
  {
    canonical: 'اسکوپ',
    synonyms: ['اسکوپ', 'پیمانه پروتئین'],
    fallbackGrams: 50,
  },
  {
    canonical: 'پیمانه',
    synonyms: ['پیمانه'],
    fallbackGrams: 100,
  },
  {
    canonical: 'برش',
    synonyms: ['برش', 'اسلایس', 'قاچ'],
    fallbackGrams: 35,
  },
  {
    canonical: 'لیوان',
    synonyms: ['لیوان', 'ماگ'],
    fallbackGrams: 230,
  },
  {
    canonical: 'فنجان',
    synonyms: ['فنجان', 'استکان'],
    fallbackGrams: 150,
  },
  {
    canonical: 'کاسه',
    synonyms: ['کاسه', 'بشقاب'],
    fallbackGrams: 220,
  },
  {
    canonical: 'پیاله',
    synonyms: ['پیاله', 'کاسه کوچک', 'کاسه کوچیک'],
    fallbackGrams: 130,
  },
  {
    canonical: 'سیخ',
    synonyms: ['سیخ'],
    fallbackGrams: 150,
  },
  {
    canonical: 'تکه',
    synonyms: ['تکه', 'تیکه', 'قطعه', 'مربع'],
    fallbackGrams: 50,
  },
  {
    canonical: 'برگ',
    synonyms: ['برگ', 'ورق'],
    fallbackGrams: 55,
  },
  {
    canonical: 'پرس',
    synonyms: ['پرس', 'وعده'],
    fallbackGrams: 280,
  },
  {
    canonical: 'مشت',
    synonyms: ['مشت'],
    fallbackGrams: 28,
  },
  {
    canonical: 'بسته',
    synonyms: ['بسته', 'پاکت', 'ساشه'],
    fallbackGrams: 50,
  },
  {
    canonical: 'قوطی',
    synonyms: ['قوطی', 'کنسرو'],
    fallbackGrams: 180,
  },
  {
    canonical: 'حبه',
    synonyms: ['حبه'],
    fallbackGrams: 4,
  },
  {
    canonical: 'شاخه',
    synonyms: ['شاخه'],
    fallbackGrams: 15,
  },
  {
    canonical: 'خوشه',
    synonyms: ['خوشه'],
    fallbackGrams: 160,
  },
  {
    canonical: 'عدد',
    synonyms: ['عدد', 'دانه', 'دونه', 'تا'],
    fallbackGrams: 60,
  },
  {
    canonical: 'کیلوگرم',
    synonyms: ['کیلوگرم', 'کیلو', 'kg'],
    fallbackGrams: 1000,
  },
  {
    canonical: 'گرم',
    synonyms: ['گرم', 'gr', 'gram', 'grams', 'g'],
    fallbackGrams: 1,
  },
  {
    canonical: 'میلی‌لیتر',
    synonyms: ['میلی لیتر', 'میلیلیتر', 'سی سی', 'ml', 'cc'],
    fallbackGrams: 1,
  },
]

const HUNDREDS_WORDS: Record<string, number> = {
  صد: 100,
  یکصد: 100,
  دویست: 200,
  سیصد: 300,
  چهارصد: 400,
  پانصد: 500,
  ششصد: 600,
  هفتصد: 700,
  هشتصد: 800,
  نهصد: 900,
}

const TENS_WORDS: Record<string, number> = {
  بیست: 20,
  سی: 30,
  چهل: 40,
  پنجاه: 50,
  شصت: 60,
  هفتاد: 70,
  هشتاد: 80,
  نود: 90,
}

const TEENS_WORDS: Record<string, number> = {
  ده: 10,
  یازده: 11,
  دوازده: 12,
  سیزده: 13,
  چهارده: 14,
  پانزده: 15,
  پونزده: 15,
  شانزده: 16,
  هفده: 17,
  هجده: 18,
  نوزده: 19,
}

const ONES_WORDS: Record<string, number> = {
  یک: 1,
  یه: 1,
  یکی: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  شیش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
}

const SINGLE_NUMBER_WORDS: Record<string, number> = {
  ربع: 0.25,
  نصف: 0.5,
  نصفه: 0.5,
  نصفی: 0.5,
  نیم: 0.5,
  ...ONES_WORDS,
  دوتا: 2,
  سهتا: 3,
  چهارتا: 4,
  پنجتا: 5,
  ...TEENS_WORDS,
  ...TENS_WORDS,
  بیستوپنج: 25,
  ...HUNDREDS_WORDS,
}

const FRACTION_PHRASES: Array<{ tokens: string[]; value: number }> = [
  { tokens: ['یک', 'دوم'], value: 0.5 },
  { tokens: ['یک', 'چهارم'], value: 0.25 },
  { tokens: ['سه', 'چهارم'], value: 0.75 },
  { tokens: ['یک', 'سوم'], value: 0.33 },
  { tokens: ['دو', 'سوم'], value: 0.67 },
]

// Strict place-value Persian compound number patterns to protect "و" during segment splitting
const HUNDREDS_PATTERN = '(?:صد|یکصد|دویست|سیصد|چهارصد|پانصد|ششصد|هفتصد|هشتصد|نهصد)'
const TENS_PATTERN = '(?:بیست|سی|چهل|پنجاه|شصت|هفتاد|هشتاد|نود)'
const TEENS_ONES_PATTERN =
  '(?:یازده|دوازده|سیزده|چهارده|پانزده|پونزده|شانزده|هفده|هجده|نوزده|ده|یک|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه)'
const ONES_STRICT_PATTERN = '(?:یک|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه)'

export const COMPOUND_HUNDREDS_REGEX = new RegExp(
  `(^|\\s)(${HUNDREDS_PATTERN})\\s+و\\s+(${TENS_PATTERN})(?:\\s+و\\s+(${ONES_STRICT_PATTERN}))?(?=\\s|$)`,
  'g',
)
export const COMPOUND_HUNDREDS_SMALL_REGEX = new RegExp(
  `(^|\\s)(${HUNDREDS_PATTERN})\\s+و\\s+(${TEENS_ONES_PATTERN})(?=\\s|$)`,
  'g',
)
export const COMPOUND_TENS_ONES_REGEX = new RegExp(
  `(^|\\s)(${TENS_PATTERN})\\s+و\\s+(${ONES_STRICT_PATTERN})(?=\\s|$)`,
  'g',
)
const NUMBER_TOKEN_PATTERN =
  '(?:\\d+(?:\\.\\d+)?|یک|یه|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه|ده)'
export const COMPOUND_FRAC_QTY_REGEX = new RegExp(
  `(^|\\s)(${NUMBER_TOKEN_PATTERN})\\s+و\\s+(نیم|نصف|نصفی|ربع|یک\\s+دوم|یک\\s+چهارم)(?=\\s|$)`,
  'g',
)

function parseNumericToken(token: string): number | null {
  if (/^\d+(?:\.\d+)?$/.test(token)) {
    const n = Number(token)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const fracMatch = token.match(/^(\d+)\/(\d+)$/)
  if (fracMatch) {
    const num = Number(fracMatch[1])
    const den = Number(fracMatch[2])
    if (den > 0 && num > 0) return Math.round((num / den) * 100) / 100
  }
  return null
}

/** Parses descending multi-word Persian integers such as "صد و بیست و پنج" (125) or "بیست و پنج" (25). */
function matchCompoundIntegerWords(tokens: string[]): { value: number; consumed: number } | null {
  if (tokens.length === 0) return null

  let idx = 0
  let total = 0

  if (Object.hasOwn(HUNDREDS_WORDS, tokens[idx])) {
    total += HUNDREDS_WORDS[tokens[idx]]
    idx += 1

    if (idx + 1 < tokens.length && tokens[idx] === 'و') {
      const next = tokens[idx + 1]
      if (Object.hasOwn(TENS_WORDS, next)) {
        total += TENS_WORDS[next]
        idx += 2
        if (
          idx + 1 < tokens.length &&
          tokens[idx] === 'و' &&
          Object.hasOwn(ONES_WORDS, tokens[idx + 1])
        ) {
          total += ONES_WORDS[tokens[idx + 1]]
          idx += 2
        }
      } else if (Object.hasOwn(TEENS_WORDS, next)) {
        total += TEENS_WORDS[next]
        idx += 2
      } else if (Object.hasOwn(ONES_WORDS, next)) {
        total += ONES_WORDS[next]
        idx += 2
      }
    }
    return { value: total, consumed: idx }
  }

  if (Object.hasOwn(TENS_WORDS, tokens[0])) {
    total += TENS_WORDS[tokens[0]]
    idx = 1
    if (tokens.length >= 3 && tokens[1] === 'و' && Object.hasOwn(ONES_WORDS, tokens[2])) {
      total += ONES_WORDS[tokens[2]]
      idx = 3
    }
    return { value: total, consumed: idx }
  }

  return null
}

function parseBaseNumberToken(token: string): number | null {
  const numeric = parseNumericToken(token)
  if (numeric !== null) return numeric
  if (Object.hasOwn(SINGLE_NUMBER_WORDS, token)) {
    return SINGLE_NUMBER_WORDS[token]
  }
  return null
}

export function matchQuantityAtStart(tokens: string[]): QuantityMatch | null {
  if (tokens.length === 0) return null

  // 1. Multi-word compound Persian integers ("صد و پنجاه", "بیست و پنج", "صد و بیست و پنج")
  const compoundInt = matchCompoundIntegerWords(tokens)
  if (compoundInt && compoundInt.consumed > 1) {
    let qty = compoundInt.value
    let consumed = compoundInt.consumed
    let impliedUnit: string | undefined

    if (
      consumed + 1 < tokens.length &&
      tokens[consumed] === 'و' &&
      (tokens[consumed + 1] === 'نیم' || tokens[consumed + 1] === 'نصف')
    ) {
      qty += 0.5
      consumed += 2
    }
    if (
      consumed < tokens.length &&
      (tokens[consumed] === 'تا' || tokens[consumed] === 'دونه' || tokens[consumed] === 'دانه')
    ) {
      consumed += 1
      impliedUnit = 'عدد'
    }
    return { quantity: qty, consumedTokens: consumed, impliedUnit }
  }

  // 2. "<num> و یک دوم / یک چهارم" (4 tokens)
  if (tokens.length >= 4 && tokens[1] === 'و') {
    const base = parseBaseNumberToken(tokens[0])
    if (base !== null && base >= 1) {
      if (tokens[2] === 'یک' && tokens[3] === 'دوم') {
        return { quantity: base + 0.5, consumedTokens: 4 }
      }
      if (tokens[2] === 'یک' && tokens[3] === 'چهارم') {
        return { quantity: base + 0.25, consumedTokens: 4 }
      }
    }
  }

  // 3. "<num> و نیم / نصف / ربع" (3 tokens)
  if (tokens.length >= 3 && tokens[1] === 'و') {
    const base = parseBaseNumberToken(tokens[0])
    if (base !== null && base >= 1) {
      if (tokens[2] === 'نیم' || tokens[2] === 'نصف' || tokens[2] === 'نصفی') {
        return { quantity: base + 0.5, consumedTokens: 3 }
      }
      if (tokens[2] === 'ربع') {
        return { quantity: base + 0.25, consumedTokens: 3 }
      }
    }
  }

  // 4. 2-token fractions ("یک دوم", "یک چهارم", "سه چهارم", etc.)
  if (tokens.length >= 2) {
    for (const frac of FRACTION_PHRASES) {
      if (tokens[0] === frac.tokens[0] && tokens[1] === frac.tokens[1]) {
        return { quantity: frac.value, consumedTokens: 2 }
      }
    }
  }

  // 5. Colloquial "نصف یه ..." / "نصف یک ..." / "ربع یک ..."
  if (
    tokens.length >= 3 &&
    (tokens[0] === 'نصف' || tokens[0] === 'نصفه' || tokens[0] === 'نیم' || tokens[0] === 'ربع') &&
    (tokens[1] === 'یک' || tokens[1] === 'یه')
  ) {
    return {
      quantity: tokens[0] === 'ربع' ? 0.25 : 0.5,
      consumedTokens: 2,
    }
  }

  // 6. "<num> تا / دونه / دانه"
  if (tokens.length >= 2 && (tokens[1] === 'تا' || tokens[1] === 'دونه' || tokens[1] === 'دانه')) {
    const base = parseBaseNumberToken(tokens[0])
    if (base !== null) {
      return { quantity: base, consumedTokens: 2, impliedUnit: 'عدد' }
    }
  }

  if (
    tokens[0] === 'دوتا' ||
    tokens[0] === 'سهتا' ||
    tokens[0] === 'چهارتا' ||
    tokens[0] === 'پنجتا'
  ) {
    return {
      quantity: SINGLE_NUMBER_WORDS[tokens[0]],
      consumedTokens: 1,
      impliedUnit: 'عدد',
    }
  }

  const single = parseBaseNumberToken(tokens[0])
  if (single !== null) {
    return { quantity: single, consumedTokens: 1 }
  }

  return null
}

export function matchUnitAtStart(tokens: string[], patterns: UnitPattern[]): UnitMatch | null {
  if (tokens.length === 0) return null
  const normalizedTokens = tokens.map((t) => t.replace(/آ/g, 'ا'))

  for (const pattern of patterns) {
    const len = pattern.tokens.length
    if (normalizedTokens.length >= len) {
      let allMatch = true
      for (let i = 0; i < len; i++) {
        if (normalizedTokens[i] !== pattern.tokens[i]) {
          allMatch = false
          break
        }
      }
      if (allMatch) {
        return { canonical: pattern.canonical, consumedTokens: len }
      }
    }
    if (len > 1 && normalizedTokens[0] === pattern.compact) {
      return { canonical: pattern.canonical, consumedTokens: 1 }
    }
  }

  return null
}
