import {
  DEFAULT_USER_GOALS,
  MEAL_TYPE_ORDER,
  MICRONUTRIENT_SPECS,
  type FoodCategory,
  type FoodItem,
  type FoodOverrideRecord,
  type FoodUnit,
  type LoggedFoodEntry,
  type MacroValues,
  type MealTemplate,
  type MealTemplateItem,
  type MealType,
  type MicronutrientValues,
  type RecipeIngredientRecord,
  type UserGoals,
  type WeightEntry,
} from '../types/nutrition'

const VALID_CATEGORIES = new Set<FoodCategory>([
  'stews_mains',
  'rice_breads',
  'breakfast_dairy',
  'drinks_snacks',
])

export const VALID_MEAL_TYPES = new Set<MealType>([
  ...MEAL_TYPE_ORDER,
  'snack2',
  'snack3',
])
export const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Sane upper bounds for untrusted backup/localStorage data. Oversized strings are
 * clipped and oversized collections are capped so a hostile/corrupt file cannot
 * exhaust memory or freeze the UI. Import itself is additionally size-gated in
 * `analyzeBackupJson`.
 */
export const MAX_NAME_LENGTH = 200
export const MAX_TEXT_LENGTH = 1000
export const MAX_ID_LENGTH = 200
export const MAX_UNIT_NAME_LENGTH = 60
export const MAX_FOODS = 5000
export const MAX_ENTRIES = 20000
export const MAX_OVERRIDES = 5000
export const MAX_WEIGHTS = 20000
export const MAX_TEMPLATES = 1000
export const MAX_UNITS_PER_FOOD = 50
export const MAX_ALIASES_PER_FOOD = 50
export const MAX_INGREDIENTS_PER_RECIPE = 100
export const MAX_ITEMS_PER_TEMPLATE = 200
export const MAX_WATER_DAYS = 20000

function clipText(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value
}

export function isFiniteNonNegative(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0
}

function sanitizeOptionalMicronutrients(raw: unknown): Partial<MicronutrientValues> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const src = raw as Partial<MicronutrientValues>
  const out: Partial<MicronutrientValues> = {}
  let hasAny = false
  for (const spec of MICRONUTRIENT_SPECS) {
    const val = src[spec.key]
    if (isFiniteNonNegative(val)) {
      out[spec.key] = val
      hasAny = true
    }
  }
  return hasAny ? out : undefined
}

function sanitizeOptionalPer100g(raw: unknown): MacroValues | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const m = raw as Partial<MacroValues>
  if (!isFiniteNonNegative(m.kcal) || kcalIsZero(m.kcal)) return undefined
  const micronutrients = sanitizeOptionalMicronutrients(m.micronutrients)
  return {
    kcal: m.kcal,
    protein: isFiniteNonNegative(m.protein) ? m.protein : 0,
    carbs: isFiniteNonNegative(m.carbs) ? m.carbs : 0,
    fat: isFiniteNonNegative(m.fat) ? m.fat : 0,
    ...(isFiniteNonNegative(m.fiber) ? { fiber: m.fiber } : {}),
    ...(micronutrients ? { micronutrients } : {}),
  }
}

function kcalIsZero(kcal: number): boolean {
  return kcal <= 0
}

function sanitizeRecipeIngredients(raw: unknown): RecipeIngredientRecord[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: RecipeIngredientRecord[] = []
  for (const item of raw.slice(0, MAX_INGREDIENTS_PER_RECIPE)) {
    if (!item || typeof item !== 'object') continue
    const r = item as Partial<RecipeIngredientRecord>
    if (
      typeof r.foodId === 'string' &&
      r.foodId.trim() &&
      typeof r.unit === 'string' &&
      r.unit.trim() &&
      typeof r.quantity === 'number' &&
      Number.isFinite(r.quantity) &&
      r.quantity > 0
    ) {
      out.push({
        foodId: clipText(r.foodId.trim(), MAX_ID_LENGTH),
        quantity: r.quantity,
        unit: clipText(r.unit.trim(), MAX_UNIT_NAME_LENGTH),
      })
    }
  }
  return out.length > 0 ? out : undefined
}

/** Sanitizes an untrusted FoodItem object (from JSON backup or storage) so invalid fields never crash UI or parser. */
export function sanitizeImportedFood(raw: unknown): FoodItem | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Partial<FoodItem>
  if (typeof f.id !== 'string' || !f.id.trim()) return null
  if (typeof f.name !== 'string' || !f.name.trim()) return null
  if (!f.per100g || typeof f.per100g !== 'object') return null

  const { kcal, protein, carbs, fat, fiber } = f.per100g
  if (!isFiniteNonNegative(kcal) || kcal <= 0) return null

  if (!Array.isArray(f.units) || f.units.length === 0) return null
  const cleanUnits: FoodUnit[] = f.units
    .slice(0, MAX_UNITS_PER_FOOD)
    .filter(
      (u): u is FoodUnit =>
        Boolean(u) &&
        typeof u.name === 'string' &&
        u.name.trim().length > 0 &&
        typeof u.grams === 'number' &&
        Number.isFinite(u.grams) &&
        u.grams > 0,
    )
    .map((u) => ({
      name: clipText(u.name.trim(), MAX_UNIT_NAME_LENGTH),
      grams: u.grams,
      ...(Array.isArray(u.aliases)
        ? {
            aliases: u.aliases
              .slice(0, MAX_ALIASES_PER_FOOD)
              .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
              .map((a) => clipText(a.trim(), MAX_NAME_LENGTH)),
          }
        : {}),
    }))

  if (cleanUnits.length === 0) return null
  if (!cleanUnits.some((u) => u.name === 'گرم')) {
    cleanUnits.push({ name: 'گرم', grams: 1 })
  }

  const cleanAliases = Array.isArray(f.aliases)
    ? f.aliases
        .slice(0, MAX_ALIASES_PER_FOOD)
        .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
        .map((a) => clipText(a.trim(), MAX_NAME_LENGTH))
    : []

  const category: FoodCategory =
    typeof f.category === 'string' && VALID_CATEGORIES.has(f.category as FoodCategory)
      ? (f.category as FoodCategory)
      : 'stews_mains'

  const defaultUnit =
    typeof f.defaultUnit === 'string' && cleanUnits.some((u) => u.name === f.defaultUnit)
      ? f.defaultUnit
      : cleanUnits[0].name

  const cleanBarcode =
    typeof f.barcode === 'string' && /^\d{8,14}$/.test(f.barcode.trim())
      ? f.barcode.trim()
      : undefined
  const cleanRecipeIngredients = sanitizeRecipeIngredients(f.recipeIngredients)
  const cleanYield =
    typeof f.cookingYieldPct === 'number' &&
    Number.isFinite(f.cookingYieldPct) &&
    f.cookingYieldPct >= 25 &&
    f.cookingYieldPct <= 400
      ? Math.round(f.cookingYieldPct)
      : undefined

  const cleanMicro = sanitizeOptionalMicronutrients(f.per100g.micronutrients)

  return {
    id: clipText(f.id.trim(), MAX_ID_LENGTH),
    name: clipText(f.name.trim(), MAX_NAME_LENGTH),
    aliases: cleanAliases,
    category,
    per100g: {
      kcal,
      protein: isFiniteNonNegative(protein) ? protein : 0,
      carbs: isFiniteNonNegative(carbs) ? carbs : 0,
      fat: isFiniteNonNegative(fat) ? fat : 0,
      ...(isFiniteNonNegative(fiber) ? { fiber } : {}),
      ...(cleanMicro ? { micronutrients: cleanMicro } : {}),
    },
    defaultUnit,
    units: cleanUnits,
    ...(cleanBarcode ? { barcode: cleanBarcode } : {}),
    ...(typeof f.source === 'string' && f.source.trim()
      ? { source: clipText(f.source.trim(), MAX_TEXT_LENGTH) }
      : {}),
    ...(typeof f.verified === 'boolean' ? { verified: f.verified } : {}),
    ...(f.isCustom ? { isCustom: true } : {}),
    ...(f.isRecipe ? { isRecipe: true } : {}),
    ...(cleanRecipeIngredients ? { recipeIngredients: cleanRecipeIngredients } : {}),
    ...(cleanYield !== undefined ? { cookingYieldPct: cleanYield } : {}),
  }
}

export function sanitizeFoodList(raw: unknown): FoodItem[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const result: FoodItem[] = []
  for (const item of raw.slice(0, MAX_FOODS)) {
    const clean = sanitizeImportedFood(item)
    if (clean && !seen.has(clean.id)) {
      seen.add(clean.id)
      result.push(clean)
    }
  }
  return result
}

export function sanitizeFoodOverrides(raw: unknown): Record<string, FoodOverrideRecord> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const result: Record<string, FoodOverrideRecord> = {}
  for (const [id, entry] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_OVERRIDES)) {
    if (!id.trim() || !entry || typeof entry !== 'object') continue
    const rec = entry as Partial<FoodOverrideRecord>
    const cleanFood = sanitizeImportedFood(rec.food ?? entry)
    if (!cleanFood) continue
    const cleanId = clipText(id.trim(), MAX_ID_LENGTH)
    result[cleanId] = {
      food: { ...cleanFood, id: cleanId, isCustom: false, isOverridden: true },
      baseCatalogVersion:
        typeof rec.baseCatalogVersion === 'string' && rec.baseCatalogVersion.trim()
          ? clipText(rec.baseCatalogVersion.trim(), MAX_ID_LENGTH)
          : 'legacy',
      updatedAt:
        typeof rec.updatedAt === 'number' && Number.isFinite(rec.updatedAt) && rec.updatedAt > 0
          ? rec.updatedAt
          : Date.now(),
    }
  }
  return result
}

/** Sanitizes an untrusted LoggedFoodEntry object so invalid mealType/NaN values never crash TodayMealsList. */
export function sanitizeImportedEntry(raw: unknown): LoggedFoodEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Partial<LoggedFoodEntry>
  if (typeof e.id !== 'string' || !e.id.trim()) return null
  if (typeof e.dateKey !== 'string' || !DATE_KEY_REGEX.test(e.dateKey)) return null
  if (typeof e.foodName !== 'string' || !e.foodName.trim()) return null
  if (!isFiniteNonNegative(e.kcal)) return null

  const mealType: MealType =
    typeof e.mealType === 'string' && VALID_MEAL_TYPES.has(e.mealType as MealType)
      ? (e.mealType as MealType)
      : 'snack'

  const quantity =
    typeof e.quantity === 'number' && Number.isFinite(e.quantity) && e.quantity > 0
      ? e.quantity
      : 1

  const per100g = sanitizeOptionalPer100g(e.per100g)
  const micronutrients = sanitizeOptionalMicronutrients(e.micronutrients)

  return {
    id: clipText(e.id.trim(), MAX_ID_LENGTH),
    dateKey: e.dateKey,
    timestamp:
      typeof e.timestamp === 'number' && Number.isFinite(e.timestamp) && e.timestamp > 0
        ? e.timestamp
        : Date.now(),
    mealType,
    foodId:
      typeof e.foodId === 'string' && e.foodId.trim()
        ? clipText(e.foodId.trim(), MAX_ID_LENGTH)
        : 'custom',
    foodName: clipText(e.foodName.trim(), MAX_NAME_LENGTH),
    quantity,
    unit:
      typeof e.unit === 'string' && e.unit.trim()
        ? clipText(e.unit.trim(), MAX_UNIT_NAME_LENGTH)
        : 'پرس',
    totalGrams:
      typeof e.totalGrams === 'number' && Number.isFinite(e.totalGrams) && e.totalGrams > 0
        ? e.totalGrams
        : 100,
    kcal: Math.round(e.kcal),
    protein: isFiniteNonNegative(e.protein) ? e.protein : 0,
    carbs: isFiniteNonNegative(e.carbs) ? e.carbs : 0,
    fat: isFiniteNonNegative(e.fat) ? e.fat : 0,
    ...(isFiniteNonNegative(e.fiber) ? { fiber: e.fiber } : {}),
    ...(micronutrients ? { micronutrients } : {}),
    ...(typeof e.modifierLabel === 'string' && e.modifierLabel.trim()
      ? { modifierLabel: clipText(e.modifierLabel.trim(), MAX_UNIT_NAME_LENGTH) }
      : {}),
    ...(per100g ? { per100g } : {}),
    ...(typeof e.sourceText === 'string'
      ? { sourceText: clipText(e.sourceText, MAX_TEXT_LENGTH) }
      : {}),
  }
}

export function sanitizeEntryList(raw: unknown): LoggedFoodEntry[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: LoggedFoodEntry[] = []
  for (const item of raw.slice(0, MAX_ENTRIES)) {
    const clean = sanitizeImportedEntry(item)
    if (clean && !seen.has(clean.id)) {
      seen.add(clean.id)
      out.push(clean)
    }
  }
  return out
}

export function sanitizeWaterMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const clean: Record<string, number> = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_WATER_DAYS)) {
    if (DATE_KEY_REGEX.test(key) && typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      const clamped = Math.min(30, Math.round(val))
      if (clamped > 0) {
        clean[key] = clamped
      }
    }
  }
  return clean
}

export function sanitizeWeightEntry(raw: unknown): WeightEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const w = raw as Partial<WeightEntry>
  if (typeof w.dateKey !== 'string' || !DATE_KEY_REGEX.test(w.dateKey)) return null
  if (
    typeof w.weightKg !== 'number' ||
    !Number.isFinite(w.weightKg) ||
    w.weightKg < 25 ||
    w.weightKg > 300
  ) {
    return null
  }
  return {
    dateKey: w.dateKey,
    weightKg: Math.round(w.weightKg * 10) / 10,
    updatedAt:
      typeof w.updatedAt === 'number' && Number.isFinite(w.updatedAt) && w.updatedAt > 0
        ? w.updatedAt
        : Date.now(),
  }
}

export function sanitizeWeightList(raw: unknown): WeightEntry[] {
  if (!Array.isArray(raw)) return []
  const byDate = new Map<string, WeightEntry>()
  for (const item of raw.slice(0, MAX_WEIGHTS)) {
    const clean = sanitizeWeightEntry(item)
    if (!clean) continue
    const prev = byDate.get(clean.dateKey)
    if (!prev || clean.updatedAt >= prev.updatedAt) {
      byDate.set(clean.dateKey, clean)
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

export function sanitizeTemplateItem(raw: unknown): MealTemplateItem | null {
  if (!raw || typeof raw !== 'object') return null
  const it = raw as Partial<MealTemplateItem>
  if (typeof it.foodName !== 'string' || !it.foodName.trim()) return null
  if (!isFiniteNonNegative(it.kcal)) return null

  const quantity =
    typeof it.quantity === 'number' && Number.isFinite(it.quantity) && it.quantity > 0
      ? it.quantity
      : 1

  return {
    foodId:
      typeof it.foodId === 'string' && it.foodId.trim()
        ? clipText(it.foodId.trim(), MAX_ID_LENGTH)
        : 'custom',
    foodName: clipText(it.foodName.trim(), MAX_NAME_LENGTH),
    quantity,
    unit:
      typeof it.unit === 'string' && it.unit.trim()
        ? clipText(it.unit.trim(), MAX_UNIT_NAME_LENGTH)
        : 'پرس',
    totalGrams:
      typeof it.totalGrams === 'number' && Number.isFinite(it.totalGrams) && it.totalGrams > 0
        ? it.totalGrams
        : 100,
    kcal: Math.round(it.kcal),
    protein: isFiniteNonNegative(it.protein) ? it.protein : 0,
    carbs: isFiniteNonNegative(it.carbs) ? it.carbs : 0,
    fat: isFiniteNonNegative(it.fat) ? it.fat : 0,
    ...(isFiniteNonNegative(it.fiber) ? { fiber: it.fiber } : {}),
  }
}

export function sanitizeTemplate(raw: unknown): MealTemplate | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Partial<MealTemplate>
  if (typeof t.id !== 'string' || !t.id.trim()) return null
  if (typeof t.name !== 'string' || !t.name.trim()) return null
  if (!Array.isArray(t.items) || t.items.length === 0) return null

  const cleanItems = t.items
    .slice(0, MAX_ITEMS_PER_TEMPLATE)
    .map(sanitizeTemplateItem)
    .filter((it): it is MealTemplateItem => it !== null)
  if (cleanItems.length === 0) return null

  const mealType: MealType =
    typeof t.mealType === 'string' && VALID_MEAL_TYPES.has(t.mealType as MealType)
      ? (t.mealType as MealType)
      : 'snack'

  return {
    id: clipText(t.id.trim(), MAX_ID_LENGTH),
    name: clipText(t.name.trim(), MAX_NAME_LENGTH),
    mealType,
    items: cleanItems,
    createdAt:
      typeof t.createdAt === 'number' && Number.isFinite(t.createdAt) && t.createdAt > 0
        ? t.createdAt
        : Date.now(),
  }
}

export function sanitizeTemplateList(raw: unknown): MealTemplate[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: MealTemplate[] = []
  for (const item of raw.slice(0, MAX_TEMPLATES)) {
    const clean = sanitizeTemplate(item)
    if (clean && !seen.has(clean.id)) {
      seen.add(clean.id)
      out.push(clean)
    }
  }
  return out
}

export function normalizeGoals(raw: Partial<UserGoals> | null | undefined): UserGoals {
  if (!raw || typeof raw !== 'object') return DEFAULT_USER_GOALS
  return {
    dailyKcal:
      typeof raw.dailyKcal === 'number' && Number.isFinite(raw.dailyKcal) && raw.dailyKcal >= 800
        ? Math.min(8000, Math.round(raw.dailyKcal))
        : DEFAULT_USER_GOALS.dailyKcal,
    proteinGrams:
      typeof raw.proteinGrams === 'number' &&
      Number.isFinite(raw.proteinGrams) &&
      raw.proteinGrams >= 20
        ? Math.min(500, Math.round(raw.proteinGrams))
        : DEFAULT_USER_GOALS.proteinGrams,
    carbsGrams:
      typeof raw.carbsGrams === 'number' && Number.isFinite(raw.carbsGrams) && raw.carbsGrams >= 20
        ? Math.min(1000, Math.round(raw.carbsGrams))
        : DEFAULT_USER_GOALS.carbsGrams,
    fatGrams:
      typeof raw.fatGrams === 'number' && Number.isFinite(raw.fatGrams) && raw.fatGrams >= 15
        ? Math.min(350, Math.round(raw.fatGrams))
        : DEFAULT_USER_GOALS.fatGrams,
    fiberGrams:
      typeof raw.fiberGrams === 'number' && Number.isFinite(raw.fiberGrams) && raw.fiberGrams >= 10
        ? Math.min(100, Math.round(raw.fiberGrams))
        : (DEFAULT_USER_GOALS.fiberGrams ?? 28),
    waterGoalGlasses:
      typeof raw.waterGoalGlasses === 'number' &&
      Number.isFinite(raw.waterGoalGlasses) &&
      raw.waterGoalGlasses >= 4
        ? Math.min(25, Math.round(raw.waterGoalGlasses))
        : DEFAULT_USER_GOALS.waterGoalGlasses,
    scheduleMode:
      raw.scheduleMode === 'ramadan' || raw.scheduleMode === 'fasting_16_8'
        ? raw.scheduleMode
        : 'standard',
    ...(typeof raw.extraSnackCount === 'number' && Number.isFinite(raw.extraSnackCount)
      ? { extraSnackCount: Math.max(0, Math.min(2, Math.round(raw.extraSnackCount))) }
      : {}),
    ...(raw.customMealLabels && typeof raw.customMealLabels === 'object'
      ? {
          customMealLabels: Object.fromEntries(
            Object.entries(raw.customMealLabels)
              .filter(([key, value]) =>
                VALID_MEAL_TYPES.has(key as MealType) &&
                typeof value === 'string' &&
                value.trim().length > 0,
              )
              .map(([key, value]) => [
                key,
                clipText((value as string).trim(), MAX_UNIT_NAME_LENGTH),
              ]),
          ) as Partial<Record<MealType, string>>,
        }
      : {}),
    ...(Array.isArray(raw.quickFavorites)
      ? {
          quickFavorites: [
            ...new Set(
              raw.quickFavorites
                .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
                .map((id) => clipText(id.trim(), MAX_ID_LENGTH)),
            ),
          ].slice(0, 100),
        }
      : {}),
    ...(raw.sex === 'male' || raw.sex === 'female' ? { sex: raw.sex } : {}),
    ...(typeof raw.ageYears === 'number' &&
    Number.isFinite(raw.ageYears) &&
    raw.ageYears >= 18 &&
    raw.ageYears <= 100
      ? { ageYears: Math.round(raw.ageYears) }
      : {}),
    ...(typeof raw.targetWeightKg === 'number' &&
    Number.isFinite(raw.targetWeightKg) &&
    raw.targetWeightKg >= 30 &&
    raw.targetWeightKg <= 250
      ? { targetWeightKg: Math.round(raw.targetWeightKg * 10) / 10 }
      : {}),
  }
}
