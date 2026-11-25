import type { FoodItem } from '../types/nutrition'
import { BREADS_RICE_AND_FASTFOOD } from './foods/breadsFastFoodAndSides'
import { BREAKFAST_DAIRY_SWEETS_NUTS } from './foods/breakfastDairySweetsNuts'
import { NUTRITION_DATA_SOURCES } from './foods/foodBuilder'
import { FRUITS_VEG_DRINKS_PACKAGED } from './foods/fruitsVegDrinksPackaged'
import { STEWS_AND_MAINS } from './foods/stewsAndMains'

export { NUTRITION_DATA_SOURCES }

/**
 * Semantic catalog revision stamp. Built-in foods are always loaded directly from code
 * (only user custom foods and explicit overrides are persisted in localStorage), so
 * bumping CATALOG_VERSION delivers nutrition refinements to all existing users cleanly.
 */
export const CATALOG_VERSION = '2026.11.3'

/**
 * Deduplicated curated database of 315+ everyday Iranian home-cooked dishes,
 * regional specialties, breads, fast foods, dairy, sweets, nuts, fruits,
 * traditional drinks, and common supermarket items.
 *
 * All nutrition values per 100g are approximate household averages compiled from:
 * - Iranian Food Composition Table (National Nutrition and Food Technology Research Institute)
 * - USDA FoodData Central
 * - Standard Iranian packaged food nutrition labels
 */
function buildUnifiedCatalog(): FoodItem[] {
  const seenIds = new Set<string>()
  const merged: FoodItem[] = []

  const groups = [
    STEWS_AND_MAINS,
    BREADS_RICE_AND_FASTFOOD,
    BREAKFAST_DAIRY_SWEETS_NUTS,
    FRUITS_VEG_DRINKS_PACKAGED,
  ]

  for (const group of groups) {
    for (const item of group) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id)
        merged.push(item)
      }
    }
  }

  return merged
}

export const DEFAULT_IRANIAN_FOODS: FoodItem[] = buildUnifiedCatalog()

export const QUICK_MEAL_SUGGESTIONS: string[] = [
  'دو کفگیر قورمه‌سبزی و یک کف دست سنگک و نصف لیوان دوغ',
  'دو تخم‌مرغ آب‌پز و یک کف دست بربری و یک تکه پنیر سفید',
  'یک سیخ جوجه کباب و دو کفگیر برنج آبکش و یک پیاله سالاد شیرازی',
  'یک کاسه آش رشته',
  'یک تکه ته‌چین مرغ و یک پیاله ماست',
  'یک لیوان شیر و سه عدد خرما و یک موز',
]
