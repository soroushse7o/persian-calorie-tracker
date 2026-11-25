import { CATALOG_VERSION, DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import type { FoodItem, FoodOverrideRecord } from '../types/nutrition'

export interface UserFoodLayer {
  customFoods: FoodItem[]
  foodOverrides: Record<string, FoodOverrideRecord>
}

function normalizeUnitsKey(food: FoodItem): string {
  return food.units
    .filter((u) => u.name !== 'گرم')
    .map((u) => `${u.name.trim()}:${Math.round(u.grams * 100) / 100}`)
    .join('|')
}

function normalizeAliasesKey(aliases: string[]): string {
  return aliases
    .map((a) => a.trim())
    .filter(Boolean)
    .sort()
    .join('|')
}

/**
 * Checks whether a stored built-in food item was customized by the user
 * compared to the built-in default definition.
 */
export function isBuiltInFoodModified(candidate: FoodItem, baseDefault: FoodItem): boolean {
  if (candidate.name.trim() !== baseDefault.name.trim()) return true
  if (candidate.category !== baseDefault.category) return true
  if (candidate.defaultUnit !== baseDefault.defaultUnit) return true
  if (
    Math.abs(candidate.per100g.kcal - baseDefault.per100g.kcal) > 0.05 ||
    Math.abs(candidate.per100g.protein - baseDefault.per100g.protein) > 0.05 ||
    Math.abs(candidate.per100g.carbs - baseDefault.per100g.carbs) > 0.05 ||
    Math.abs(candidate.per100g.fat - baseDefault.per100g.fat) > 0.05
  ) {
    return true
  }
  if (normalizeUnitsKey(candidate) !== normalizeUnitsKey(baseDefault)) return true
  if (normalizeAliasesKey(candidate.aliases) !== normalizeAliasesKey(baseDefault.aliases)) {
    return true
  }
  return false
}

/**
 * Extracts ONLY user-created custom foods and modified built-in overrides from a legacy
 * full-catalog FoodItem[] array (v1/v2 storage or backup). Unmodified built-ins are dropped
 * so built-in foods always flow directly from code with the latest CATALOG_VERSION fixes.
 */
export function extractUserFoodLayer(
  fullFoods: FoodItem[],
  defaults: FoodItem[] = DEFAULT_IRANIAN_FOODS,
  baseVersion = 'legacy-v2',
): UserFoodLayer {
  const defaultsById = new Map<string, FoodItem>(defaults.map((f) => [f.id, f]))
  const customFoods: FoodItem[] = []
  const foodOverrides: Record<string, FoodOverrideRecord> = {}
  const seenCustom = new Set<string>()

  for (const item of fullFoods) {
    const def = defaultsById.get(item.id)
    if (!def || item.isCustom) {
      const customId = def && item.isCustom ? `custom-${item.id}` : item.id
      if (!seenCustom.has(customId)) {
        seenCustom.add(customId)
        customFoods.push({
          ...item,
          id: customId,
          isCustom: true,
        })
      }
      continue
    }

    if (isBuiltInFoodModified(item, def)) {
      foodOverrides[def.id] = {
        food: {
          ...item,
          id: def.id,
          isCustom: false,
          isOverridden: true,
        },
        baseCatalogVersion: baseVersion,
        updatedAt: Date.now(),
      }
    }
  }

  return { customFoods, foodOverrides }
}

/**
 * Builds the runtime FoodItem[] catalog from:
 * 1. User's custom foods (`customFoods`)
 * 2. Code-defined `DEFAULT_IRANIAN_FOODS` (`CATALOG_VERSION`), overlaid with explicit `foodOverrides`.
 */
export function buildEffectiveCatalog(
  customFoods: FoodItem[],
  foodOverrides: Record<string, FoodOverrideRecord>,
  defaults: FoodItem[] = DEFAULT_IRANIAN_FOODS,
): FoodItem[] {
  const defaultIds = new Set(defaults.map((d) => d.id))

  const cleanCustom: FoodItem[] = customFoods
    .filter((f) => !defaultIds.has(f.id))
    .map((f) => ({
      ...f,
      isCustom: true,
      source: f.source ?? (f.isRecipe ? 'دستور پخت شخصی کاربر' : 'غذای ثبت‌شده توسط کاربر'),
      verified: false,
    }))

  const builtInsWithOverrides: FoodItem[] = defaults.map((def) => {
    const override = foodOverrides[def.id]
    if (!override) return def

    const hasGram = override.food.units.some((u) => u.name === 'گرم')
    return {
      ...def,
      ...override.food,
      id: def.id,
      units: hasGram ? override.food.units : [...override.food.units, { name: 'گرم', grams: 1 }],
      isCustom: false,
      isOverridden: true,
      source: 'ویرایش شخصی کاربر بر پایه کاتالوگ پیش‌فرض',
      verified: false,
    }
  })

  return [...cleanCustom, ...builtInsWithOverrides]
}

/**
 * Creates or updates a single built-in food override record, or removes the override
 * automatically if the user edited values back to match the code default.
 */
export function upsertBuiltInOverride(
  currentOverrides: Record<string, FoodOverrideRecord>,
  updatedFood: FoodItem,
  defaults: FoodItem[] = DEFAULT_IRANIAN_FOODS,
  catalogVersion: string = CATALOG_VERSION,
): Record<string, FoodOverrideRecord> {
  const def = defaults.find((d) => d.id === updatedFood.id)
  if (!def) return currentOverrides

  if (!isBuiltInFoodModified(updatedFood, def)) {
    const next = { ...currentOverrides }
    delete next[def.id]
    return next
  }

  return {
    ...currentOverrides,
    [def.id]: {
      food: {
        ...updatedFood,
        id: def.id,
        isCustom: false,
        isOverridden: true,
      },
      baseCatalogVersion: catalogVersion,
      updatedAt: Date.now(),
    },
  }
}

/** Backwards-compatible helper merging a stored FoodItem[] list with code defaults. */
export function mergeDefaultCatalog(
  stored: FoodItem[] | null,
  defaults: FoodItem[] = DEFAULT_IRANIAN_FOODS,
): FoodItem[] {
  if (!Array.isArray(stored) || stored.length === 0) {
    return defaults
  }
  const { customFoods, foodOverrides } = extractUserFoodLayer(stored, defaults, CATALOG_VERSION)
  return buildEffectiveCatalog(customFoods, foodOverrides, defaults)
}
