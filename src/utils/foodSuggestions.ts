import type { FoodItem, LoggedFoodEntry } from '../types/nutrition'

export interface FrequentFoodSuggestion {
  food: FoodItem
  count: number
  lastUnit: string
}

/**
 * Computes personalized recent & most-frequent foods from local meal history
 * for 1-tap logging in QuickEntryBar (Phase 3 Growth feature).
 */
export function computeRecentAndFrequentFoods(
  entries: LoggedFoodEntry[],
  foods: FoodItem[],
  maxItems = 8,
): {
  recentFoods: Array<{ food: FoodItem; lastUnit: string }>
  frequentFoods: FrequentFoodSuggestion[]
} {
  if (entries.length === 0 || foods.length === 0) {
    return { recentFoods: [], frequentFoods: [] }
  }

  const foodById = new Map<string, FoodItem>(foods.map((f) => [f.id, f]))
  const recentFoods: Array<{ food: FoodItem; lastUnit: string }> = []
  const seenRecent = new Set<string>()

  const counts = new Map<string, { count: number; lastUnit: string; latestTs: number }>()

  for (const entry of entries) {
    const food = foodById.get(entry.foodId)
    if (!food) continue

    if (!seenRecent.has(food.id) && recentFoods.length < maxItems) {
      seenRecent.add(food.id)
      const validUnit = food.units.some((u) => u.name === entry.unit)
        ? entry.unit
        : food.defaultUnit
      recentFoods.push({ food, lastUnit: validUnit })
    }

    const existing = counts.get(food.id)
    const validUnit = food.units.some((u) => u.name === entry.unit) ? entry.unit : food.defaultUnit
    if (existing) {
      existing.count += 1
      if (entry.timestamp > existing.latestTs) {
        existing.latestTs = entry.timestamp
        existing.lastUnit = validUnit
      }
    } else {
      counts.set(food.id, { count: 1, lastUnit: validUnit, latestTs: entry.timestamp })
    }
  }

  const frequentFoods: FrequentFoodSuggestion[] = Array.from(counts.entries())
    .map(([id, meta]) => {
      const food = foodById.get(id)!
      return { food, count: meta.count, lastUnit: meta.lastUnit }
    })
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems)

  return { recentFoods, frequentFoods }
}
