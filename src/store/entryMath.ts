import type { FoodItem, LoggedFoodEntry, MacroValues, MealType } from '../types/nutrition'
import { calculateFoodMacros } from '../utils/persianFoodParser'

export interface EntryUpdatePatch {
  quantity?: number
  unit?: string
  mealType?: MealType
}

function deriveFallbackPer100g(entry: LoggedFoodEntry): MacroValues {
  if (entry.per100g && entry.per100g.kcal > 0) {
    return entry.per100g
  }
  const baseGrams = entry.totalGrams > 0 ? entry.totalGrams : 100
  const factor = 100 / baseGrams
  return {
    kcal: entry.kcal * factor,
    protein: entry.protein * factor,
    carbs: entry.carbs * factor,
    fat: entry.fat * factor,
    fiber: (entry.fiber ?? 0) * factor,
  }
}

function isWeightUnitName(unitName: string): boolean {
  return unitName === 'گرم' || unitName === 'میلی‌لیتر'
}

/**
 * Pure, deterministic entry updater that ALWAYS recomputes `totalGrams`, `kcal`,
 * `protein`, `carbs`, `fat`, and `fiber` from `per100g × grams` (never scaling previously
 * rounded values), while preserving any cooking modifier (`entry.per100g` when `modifierLabel` is set).
 */
export function recomputeUpdatedEntry(
  entry: LoggedFoodEntry,
  patch: EntryUpdatePatch,
  foods: FoodItem[],
): LoggedFoodEntry {
  const nextMealType = patch.mealType ?? entry.mealType
  const unitChanged = patch.unit !== undefined && patch.unit !== entry.unit
  const qtyChanged = patch.quantity !== undefined && patch.quantity !== entry.quantity

  if (!unitChanged && !qtyChanged) {
    if (nextMealType === entry.mealType) return entry
    return { ...entry, mealType: nextMealType }
  }

  const matchedFood = foods.find((f) => f.id === entry.foodId)
  const targetUnitName = patch.unit ?? entry.unit

  let resolvedUnitName = targetUnitName
  let gramsPerUnit: number

  if (isWeightUnitName(targetUnitName)) {
    gramsPerUnit = 1
  } else if (matchedFood) {
    const unitObj = matchedFood.units.find((u) => u.name === targetUnitName)
    if (unitObj) {
      resolvedUnitName = unitObj.name
      gramsPerUnit = unitObj.grams
    } else if (!unitChanged && entry.quantity > 0 && entry.totalGrams > 0) {
      gramsPerUnit = entry.totalGrams / entry.quantity
    } else {
      const defObj =
        matchedFood.units.find((u) => u.name === matchedFood.defaultUnit) ?? matchedFood.units[0]
      resolvedUnitName = defObj.name
      gramsPerUnit = defObj.grams
    }
  } else if (!unitChanged && entry.quantity > 0 && entry.totalGrams > 0) {
    gramsPerUnit = entry.totalGrams / entry.quantity
  } else {
    gramsPerUnit = 100
  }

  let nextQty = patch.quantity ?? entry.quantity
  if (unitChanged && patch.quantity === undefined) {
    const wasWeight = isWeightUnitName(entry.unit)
    const isNextWeight = isWeightUnitName(resolvedUnitName)
    if (!wasWeight && isNextWeight) {
      nextQty = Math.max(10, Math.round(entry.totalGrams))
    } else if (wasWeight && !isNextWeight && gramsPerUnit > 0) {
      nextQty = Math.max(0.5, Math.round((entry.totalGrams / gramsPerUnit) * 2) / 2)
    }
  }

  const safeQty = Math.max(0.1, Math.round(nextQty * 100) / 100)
  // If user logged with a cooking modifier (e.g. کم‌روغن), preserve its modified per100g snapshot
  const effectivePer100g =
    entry.modifierLabel && entry.per100g && entry.per100g.kcal > 0
      ? entry.per100g
      : (matchedFood?.per100g ?? deriveFallbackPer100g(entry))

  const syntheticFood: FoodItem = {
    id: entry.foodId,
    name: entry.foodName,
    aliases: [],
    category: 'stews_mains',
    per100g: effectivePer100g,
    defaultUnit: resolvedUnitName,
    units: [{ name: resolvedUnitName, grams: gramsPerUnit }],
  }

  const calc = calculateFoodMacros(syntheticFood, safeQty, gramsPerUnit)

  return {
    ...entry,
    mealType: nextMealType,
    unit: resolvedUnitName,
    quantity: safeQty,
    per100g: effectivePer100g,
    ...calc,
  }
}
