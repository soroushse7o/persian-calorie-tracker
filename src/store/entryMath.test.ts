import { describe, expect, it } from 'vitest'
import { DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import type { LoggedFoodEntry } from '../types/nutrition'
import { calculateFoodMacros } from '../utils/persianFoodParser'
import { recomputeUpdatedEntry } from './entryMath'

describe('Entry Macro Recomputation Accuracy (Zero Rounding Drift)', () => {
  it('recomputes kcal and macros directly from per100g × grams without cumulative rounding drift', () => {
    const sangak = DEFAULT_IRANIAN_FOODS.find((f) => f.id === 'nan-sangak')!
    const initialCalc = calculateFoodMacros(sangak, 1, 30) // 30g -> 258 * 0.3 = 77.4 -> rounded 77 kcal

    let entry: LoggedFoodEntry = {
      id: 'e-drift-test',
      dateKey: '2026-11-24',
      timestamp: 1000,
      mealType: 'breakfast',
      foodId: sangak.id,
      foodName: sangak.name,
      quantity: 1,
      unit: 'کف دست',
      ...initialCalc,
      per100g: sangak.per100g,
    }

    // Previously, scaling rounded 77 kcal through fractional steps drifted away from exact per100g * grams!
    entry = recomputeUpdatedEntry(entry, { quantity: 0.3 }, DEFAULT_IRANIAN_FOODS)
    entry = recomputeUpdatedEntry(entry, { quantity: 0.7 }, DEFAULT_IRANIAN_FOODS)
    entry = recomputeUpdatedEntry(entry, { quantity: 3 }, DEFAULT_IRANIAN_FOODS)
    entry = recomputeUpdatedEntry(entry, { quantity: 10 }, DEFAULT_IRANIAN_FOODS)

    // 10 * 30g = 300g -> exact 258 * 3 = 774 kcal (whereas scaling rounded 77 * 10 gave 770!)
    expect(entry.totalGrams).toBe(300)
    expect(entry.kcal).toBe(774)

    // Switching unit from household unit (کف دست) to گرم converts quantity to totalGrams cleanly
    const inGrams = recomputeUpdatedEntry(entry, { unit: 'گرم' }, DEFAULT_IRANIAN_FOODS)
    expect(inGrams.unit).toBe('گرم')
    expect(inGrams.quantity).toBe(300)
    expect(inGrams.kcal).toBe(774)

    // Switching back to کف دست restores 10 کف دست = 774 kcal
    const backToPalm = recomputeUpdatedEntry(inGrams, { unit: 'کف دست' }, DEFAULT_IRANIAN_FOODS)
    expect(backToPalm.unit).toBe('کف دست')
    expect(backToPalm.quantity).toBe(10)
    expect(backToPalm.kcal).toBe(774)
  })

  it('preserves exact per100g calculation even if a custom food was deleted from catalog', () => {
    const orphanEntry: LoggedFoodEntry = {
      id: 'orphan-1',
      dateKey: '2026-11-24',
      timestamp: 1000,
      mealType: 'snack',
      foodId: 'deleted-custom-id',
      foodName: 'اسنک سفارشی',
      quantity: 1,
      unit: 'بسته',
      totalGrams: 40,
      kcal: 155,
      protein: 8.3,
      carbs: 18.2,
      fat: 5.4,
      per100g: { kcal: 387.5, protein: 20.75, carbs: 45.5, fat: 13.5 },
    }

    const doubled = recomputeUpdatedEntry(orphanEntry, { quantity: 4 }, DEFAULT_IRANIAN_FOODS)
    // 4 * 40g = 160g -> 387.5 * 1.6 = 620 kcal exact
    expect(doubled.totalGrams).toBe(160)
    expect(doubled.kcal).toBe(620)
  })
})
