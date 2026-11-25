import type { FoodItem } from '../../types/nutrition'
import { toAsciiDigits } from '../persianFormat'
import { getCatalogIndex, getPreparedFoodItem } from './catalogIndex'
import { normalizePersian, toCompactKey, toSpaceKey } from './normalize'
import { matchQuantityAtStart, matchUnitAtStart } from './unitsAndQuantities'

export interface AutocompleteSuggestion {
  food: FoodItem
  unit: string
  quantity: number
  estimatedKcal: number
  /** Full updated textarea value when user taps or presses Tab on this suggestion */
  completedInput: string
}

const SEGMENT_DELIM_REGEX = /^(.*?(?:[+,،;؛\n]|\s+و\s+))([^+,،;؛\n]*)$/s

/**
 * Computes real-time inline autocomplete completions for the active trailing segment
 * in QuickEntryBar (e.g. typing `"دو کفگیر قو"` suggests `"قورمه‌سبزی"` and completes to
 * `"دو کفگیر قورمه‌سبزی "`), boosting the user's frequent/recent foods.
 */
export function getInlineFoodAutocomplete(
  rawInput: string,
  foods: FoodItem[],
  frequentFoodIds: ReadonlySet<string> = new Set(),
  limit = 5,
): AutocompleteSuggestion[] {
  if (!rawInput || /\s$/.test(rawInput) && rawInput.trim().length === 0) return []

  const delimMatch = rawInput.match(SEGMENT_DELIM_REGEX)
  const leadingContext = delimMatch ? delimMatch[1] : ''
  const activeRaw = (delimMatch ? delimMatch[2] : rawInput).trim()
  if (activeRaw.length < 2) return []

  const normActive = normalizePersian(activeRaw)
  const tokens = normActive.split(' ').filter(Boolean)
  if (tokens.length === 0) return []

  const { unitPatterns } = getCatalogIndex(foods)

  let idx = 0
  let quantity = 1
  let explicitUnit: string | null = null

  const qtyMatch = matchQuantityAtStart(tokens)
  if (qtyMatch) {
    quantity = qtyMatch.quantity
    idx += qtyMatch.consumedTokens
    explicitUnit = qtyMatch.impliedUnit ?? null
  }

  const unitMatch = matchUnitAtStart(tokens.slice(idx), unitPatterns)
  if (unitMatch) {
    explicitUnit = unitMatch.canonical
    idx += unitMatch.consumedTokens
  }

  const partialFoodTokens = tokens.slice(idx)
  const partialFood = partialFoodTokens.join(' ').trim()
  if (partialFood.length < 2) return []

  const qSpace = toSpaceKey(partialFood)
  const qCompact = toCompactKey(partialFood)
  if (qCompact.length < 2) return []

  // Preserve user's typed quantity/unit prefix inside the active segment
  const preservedPrefixTokens = tokens.slice(0, idx)
  const preservedPrefix = preservedPrefixTokens.length > 0 ? `${preservedPrefixTokens.join(' ')} ` : ''

  const scored: Array<{ food: FoodItem; score: number }> = []

  for (const food of foods) {
    const prep = getPreparedFoodItem(food)
    // Skip if user already typed the exact full primary name with nothing left to complete
    if (prep.primary.compact === qCompact && foods.length > 1) {
      // Still allow if there are longer variants, otherwise lower priority
      scored.push({ food, score: 0.55 })
      continue
    }

    let best = 0
    if (prep.primary.compact.startsWith(qCompact)) {
      best = 1.0 - (prep.primary.compact.length - qCompact.length) * 0.01
    } else if (prep.primary.space.includes(qSpace) || prep.primary.compact.includes(qCompact)) {
      best = 0.82
    } else {
      for (const alias of prep.aliases) {
        if (alias.compact.startsWith(qCompact)) {
          best = Math.max(best, 0.92)
        } else if (alias.compact.includes(qCompact)) {
          best = Math.max(best, 0.76)
        }
      }
    }

    if (best > 0) {
      if (frequentFoodIds.has(food.id)) best += 0.12
      if (food.isCustom) best += 0.06
      scored.push({ food, score: best })
    }
  }

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map(({ food }) => {
    const chosenUnitObj =
      (explicitUnit ? food.units.find((u) => u.name === explicitUnit) : undefined) ??
      food.units.find((u) => u.name === food.defaultUnit) ??
      food.units[0]
    const unitName = chosenUnitObj?.name ?? food.defaultUnit
    const grams = chosenUnitObj?.grams ?? 100
    const estimatedKcal = Math.round((food.per100g.kcal * quantity * grams) / 100)
    const completedSegment = `${preservedPrefix}${food.name}`

    return {
      food,
      unit: unitName,
      quantity,
      estimatedKcal,
      completedInput: `${leadingContext}${completedSegment}`,
    }
  })
}

/** Normalizes and looks up an EAN-8 / EAN-13 / Iranian 626 barcode in the food catalog. */
export function findFoodByBarcode(rawBarcode: string, foods: FoodItem[]): FoodItem | null {
  const digitsOnly = toAsciiDigits(rawBarcode).replace(/\D/g, '')
  if (digitsOnly.length < 8) return null
  return foods.find((f) => f.barcode === digitsOnly) ?? null
}
