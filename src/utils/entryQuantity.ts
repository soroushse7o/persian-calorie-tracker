import type { FoodItem, LoggedFoodEntry } from '../types/nutrition'
import { toAsciiDigits } from './persianFormat'

export const GRAM_UNIT = 'گرم'
export const MILLILITER_UNIT = 'میلیلیتر'

export function isWeightUnit(unit: string): boolean {
  return unit === GRAM_UNIT || unit === MILLILITER_UNIT
}

/**
 * Parses a manually typed quantity (Persian/Arabic digits accepted).
 * Returns null for empty, non-finite or non-positive values so callers can
 * ignore intermediate keystrokes instead of writing invalid entries.
 */
export function parseEditableQuantity(raw: string): number | null {
  const ascii = toAsciiDigits(raw).replace(/,/g, '.').trim()
  if (!ascii) return null
  const value = Number(ascii)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
}

/**
 * Unit options for the inline entry editor. A gram option is always present so
 * users can switch any household unit to a direct weight, and an unknown
 * inherited unit keeps its real grams-per-unit instead of silently using 1 g.
 */
export function buildEditableUnitOptions(
  food: FoodItem | undefined,
  entry: LoggedFoodEntry,
): { name: string; grams: number }[] {
  const options = (food?.units ?? []).map((u) => ({ name: u.name, grams: u.grams }))

  if (entry.unit && !options.some((u) => u.name === entry.unit)) {
    const grams = entry.quantity > 0 ? entry.totalGrams / entry.quantity : 1
    options.unshift({ name: entry.unit, grams: grams > 0 ? grams : 1 })
  }
  if (!options.some((u) => u.name === GRAM_UNIT)) {
    options.unshift({ name: GRAM_UNIT, grams: 1 })
  }
  return options
}
