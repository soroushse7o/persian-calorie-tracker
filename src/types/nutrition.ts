import { APP_CONFIG } from '../config/env'

export type FoodCategory =
  | 'stews_mains'
  | 'rice_breads'
  | 'breakfast_dairy'
  | 'drinks_snacks'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'snack2' | 'snack3'

export type MealScheduleMode = 'standard' | 'ramadan' | 'fasting_16_8'

export type AppTab = 'home' | 'trends' | 'foods' | 'settings'

export type ThemeMode = 'dark' | 'light'

export type MicronutrientKey =
  | 'ironMg'
  | 'calciumMg'
  | 'potassiumMg'
  | 'magnesiumMg'
  | 'zincMg'
  | 'sodiumMg'
  | 'vitaminCMg'
  | 'vitaminDMcg'
  | 'vitaminB12Mcg'
  | 'vitaminAMcg'

export interface MicronutrientValues {
  ironMg: number
  calciumMg: number
  potassiumMg: number
  magnesiumMg: number
  zincMg: number
  sodiumMg: number
  vitaminCMg: number
  vitaminDMcg: number
  vitaminB12Mcg: number
  vitaminAMcg: number
}

export const EMPTY_MICRONUTRIENTS: MicronutrientValues = {
  ironMg: 0,
  calciumMg: 0,
  potassiumMg: 0,
  magnesiumMg: 0,
  zincMg: 0,
  sodiumMg: 0,
  vitaminCMg: 0,
  vitaminDMcg: 0,
  vitaminB12Mcg: 0,
  vitaminAMcg: 0,
}

export interface MicronutrientSpec {
  key: MicronutrientKey
  label: string
  shortLabel: string
  unit: 'میلی‌گرم' | 'میکروگرم'
  unitShort: 'mg' | 'mcg'
  /** Adult general Daily Reference Value (FDA/IOM/WHO approximate benchmark) */
  dailyRef: number
  group: 'vitamin' | 'mineral' | 'limit'
  /** True for nutrients like Sodium where dailyRef is a recommended ceiling rather than a minimum target */
  isUpperLimit?: boolean
  decimals: 0 | 1
  richSourcesHint: string
}

export const MICRONUTRIENT_SPECS: readonly MicronutrientSpec[] = [
  {
    key: 'ironMg',
    label: 'آهن (Iron)',
    shortLabel: 'آهن',
    unit: 'میلی‌گرم',
    unitShort: 'mg',
    dailyRef: 18,
    group: 'mineral',
    decimals: 1,
    richSourcesHint: 'عدسی، خوراک لوبیا، قورمه‌سبزی، گوشت قرمز، پسته، نان سنگک، اسفناج',
  },
  {
    key: 'calciumMg',
    label: 'کلسیم (Calcium)',
    shortLabel: 'کلسیم',
    unit: 'میلی‌گرم',
    unitShort: 'mg',
    dailyRef: 1000,
    group: 'mineral',
    decimals: 0,
    richSourcesHint: 'کشک، ماست، شیر، پنیر سفید، دوغ کم‌نمک، بادام، ارده و کنجد، سبزی خوردن',
  },
  {
    key: 'potassiumMg',
    label: 'پتاسیم (Potassium)',
    shortLabel: 'پتاسیم',
    unit: 'میلی‌گرم',
    unitShort: 'mg',
    dailyRef: 3500,
    group: 'mineral',
    decimals: 0,
    richSourcesHint: 'موز، سیب‌زمینی پخته، حبوبات، آووکادو، خرما، ماست، خورش‌های سبزی‌دار',
  },
  {
    key: 'magnesiumMg',
    label: 'منیزیم (Magnesium)',
    shortLabel: 'منیزیم',
    unit: 'میلی‌گرم',
    unitShort: 'mg',
    dailyRef: 400,
    group: 'mineral',
    decimals: 0,
    richSourcesHint: 'بادام، گردو، تخمه کدو و آفتابگردان، جو دوسر، شکلات تلخ ۷۰٪، نان سبوس‌دار و سنگک',
  },
  {
    key: 'zincMg',
    label: 'روی / زینک (Zinc)',
    shortLabel: 'روی (زینک)',
    unit: 'میلی‌گرم',
    unitShort: 'mg',
    dailyRef: 11,
    group: 'mineral',
    decimals: 1,
    richSourcesHint: 'گوشت گوساله و گوسفند، مرغ، عدس، نخود، تخمه کدو، مغزها، تخم‌مرغ',
  },
  {
    key: 'vitaminCMg',
    label: 'ویتامین C',
    shortLabel: 'ویتامین C',
    unit: 'میلی‌گرم',
    unitShort: 'mg',
    dailyRef: 90,
    group: 'vitamin',
    decimals: 0,
    richSourcesHint: 'پرتقال، کیوی، توت‌فرنگی، انار، گوجه‌فرنگی، سالاد شیرازی، سبزی خوردن، کلم بروکلی',
  },
  {
    key: 'vitaminDMcg',
    label: 'ویتامین D',
    shortLabel: 'ویتامین D',
    unit: 'میکروگرم',
    unitShort: 'mcg',
    dailyRef: 15,
    group: 'vitamin',
    decimals: 1,
    richSourcesHint: 'ماهی سالمون، ساردین، تن ماهی، زرده تخم‌مرغ، شیر و لبنیات غنی‌شده',
  },
  {
    key: 'vitaminB12Mcg',
    label: 'ویتامین B12',
    shortLabel: 'ویتامین B12',
    unit: 'میکروگرم',
    unitShort: 'mcg',
    dailyRef: 2.4,
    group: 'vitamin',
    decimals: 1,
    richSourcesHint: 'گوشت قرمز، ماهی و تن ماهی، تخم‌مرغ، شیر، ماست، پنیر و کشک',
  },
  {
    key: 'vitaminAMcg',
    label: 'ویتامین A',
    shortLabel: 'ویتامین A',
    unit: 'میکروگرم',
    unitShort: 'mcg',
    dailyRef: 900,
    group: 'vitamin',
    decimals: 0,
    richSourcesHint: 'هویج، سیب‌زمینی شیرین، اسفناج، سبزی خوردن، تخم‌مرغ، کره و لبنیات',
  },
  {
    key: 'sodiumMg',
    label: 'سدیم / نمک (سقف روزانه)',
    shortLabel: 'سدیم',
    unit: 'میلی‌گرم',
    unitShort: 'mg',
    dailyRef: 2300,
    group: 'limit',
    isUpperLimit: true,
    decimals: 0,
    richSourcesHint: 'سقف مجاز روزانه ۲۳۰۰ میلی‌گرم؛ در پنیر شور، دوغ، فست‌فود، چیپس/پفک و کنسروها بالاست',
  },
] as const

export interface MacroValues {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  micronutrients?: Partial<MicronutrientValues>
}

export interface FoodUnit {
  /** Canonical Persian household unit label, e.g. 'کفگیر', 'کف دست', 'لیوان' */
  name: string
  /** Gram weight of 1 unit */
  grams: number
  /** Optional unit aliases specific to this food */
  aliases?: string[]
}

export interface RecipeIngredientRecord {
  foodId: string
  quantity: number
  unit: string
}

export interface FoodItem {
  id: string
  name: string
  aliases: string[]
  category: FoodCategory
  per100g: MacroValues
  defaultUnit: string
  units: FoodUnit[]
  /** Optional EAN-13 / Iranian 626 supermarket barcode */
  barcode?: string
  /** Authoritative reference citation (e.g. USDA NDB # / NNFTRI Iranian table) */
  source?: string
  /** True when cross-validated against a laboratory reference table; values remain approximate for home cooking */
  verified?: boolean
  isCustom?: boolean
  isRecipe?: boolean
  /** Saved recipe ingredients & cooking yield % so composite recipes remain editable */
  recipeIngredients?: RecipeIngredientRecord[]
  cookingYieldPct?: number
  /** Runtime flag set when a built-in catalog item has an active user override */
  isOverridden?: boolean
}

export interface FoodOverrideRecord {
  food: FoodItem
  baseCatalogVersion: string
  updatedAt: number
}

export interface ParsedFoodItem {
  id: string
  food: FoodItem
  quantity: number
  unit: string
  gramsPerUnit: number
  totalGrams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  micronutrients?: MicronutrientValues
  rawSegment: string
  confidence: number
  /** Applied cooking preparation modifier (e.g. 'کم‌روغن', 'پرچرب') */
  modifierLabel?: string
  /** True when user typed a generic term (e.g. "برنج", "نان", "ماست") or fuzzy low-confidence match */
  isAmbiguous?: boolean
  /** Alternative candidate foods for quick 1-tap disambiguation */
  alternatives?: FoodItem[]
}

export interface ParseResult {
  items: ParsedFoodItem[]
  unmatchedSegments: string[]
}

export interface LoggedFoodEntry {
  id: string
  dateKey: string // Local YYYY-MM-DD
  timestamp: number
  mealType: MealType
  foodId: string
  foodName: string
  quantity: number
  unit: string
  totalGrams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  micronutrients?: Partial<MicronutrientValues>
  modifierLabel?: string
  /** Optional per-100g macro snapshot so quantity edits recompute accurately even if custom food is deleted */
  per100g?: MacroValues
  sourceText?: string
}

export interface WeightEntry {
  dateKey: string // Local YYYY-MM-DD
  weightKg: number
  updatedAt: number
}

export interface MealTemplateItem {
  foodId: string
  foodName: string
  quantity: number
  unit: string
  totalGrams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

export interface MealTemplate {
  id: string
  name: string
  mealType: MealType
  items: MealTemplateItem[]
  createdAt: number
}

export interface UserGoals {
  dailyKcal: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams?: number
  waterGoalGlasses: number
  scheduleMode?: MealScheduleMode
  /** User-renamed meal labels (override the schedule-mode preset labels). */
  customMealLabels?: Partial<Record<MealType, string>>
  /** Number of extra snack slots enabled in settings (0..2). */
  extraSnackCount?: number
  /** Food IDs pinned by the user in the quick-access personal list. */
  quickFavorites?: string[]
  /** Optional biological profile for personalized micronutrient RDAs (e.g. 8mg vs 18mg Iron) */
  sex?: 'male' | 'female'
  ageYears?: number
  /** Optional target body weight (kg) displayed as reference line on WeightLineChart */
  targetWeightKg?: number
}

export interface AppBackupData {
  version: number
  exportedAt: string
  catalogVersion?: string
  goals: UserGoals
  foods: FoodItem[]
  customFoods?: FoodItem[]
  foodOverrides?: Record<string, FoodOverrideRecord>
  entries: LoggedFoodEntry[]
  waterByDate?: Record<string, number>
  weights?: WeightEntry[]
  templates?: MealTemplate[]
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'صبحانه',
  lunch: 'ناهار',
  dinner: 'شام',
  snack: 'میان‌وعده',
  snack2: 'میان‌وعده دوم',
  snack3: 'میان‌وعده سوم',
}

export const RAMADAN_MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'سحری',
  lunch: 'افطاری',
  dinner: 'شام',
  snack: 'میان‌وعده شبانه',
  snack2: 'میان‌وعده دوم',
  snack3: 'میان‌وعده سوم',
}

export const FASTING_16_8_MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'وعده اول (شروع پنجره)',
  lunch: 'وعده اصلی',
  dinner: 'وعده پایانی پنجره',
  snack: 'میان‌وعده در پنجره',
  snack2: 'میان‌وعده دوم',
  snack3: 'میان‌وعده سوم',
}

export function getMealTypeLabels(
  mode: MealScheduleMode = 'standard',
  customLabels?: Partial<Record<MealType, string>>,
): Record<MealType, string> {
  const base = mode === 'ramadan'
    ? RAMADAN_MEAL_TYPE_LABELS
    : mode === 'fasting_16_8'
      ? FASTING_16_8_MEAL_TYPE_LABELS
      : MEAL_TYPE_LABELS
  return { ...base, ...(customLabels ?? {}) }
}

/** Meal slots shown in the UI. Extra snack slots are opt-in via settings. */
export function getMealTypes(extraSnackCount = 0): MealType[] {
  const slots: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
  if (extraSnackCount >= 1) slots.push('snack2')
  if (extraSnackCount >= 2) slots.push('snack3')
  return slots
}

/** Suggested share of daily kcal per meal slot for gentle budgeting hints. */
export const MEAL_BUDGET_RATIOS: Record<MealScheduleMode, Record<MealType, number>> = {
  standard: {
    breakfast: 0.25,
    lunch: 0.38,
    dinner: 0.27,
    snack: 0.06,
    snack2: 0.03,
    snack3: 0.01,
  },
  ramadan: {
    breakfast: 0.35, // سحری
    lunch: 0.35, // افطاری
    dinner: 0.2, // شام سبک
    snack: 0.06, // میان‌وعده شبانه
    snack2: 0.03,
    snack3: 0.01,
  },
  fasting_16_8: {
    breakfast: 0.3, // وعده اول
    lunch: 0.4, // وعده اصلی
    dinner: 0.2, // وعده پایانی
    snack: 0.06, // میان‌وعده
    snack2: 0.03,
    snack3: 0.01,
  },
}

export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  stews_mains: 'خورش و غذای اصلی',
  rice_breads: 'برنج و نان',
  breakfast_dairy: 'صبحانه و لبنیات',
  drinks_snacks: 'نوشیدنی، میوه و میان‌وعده',
}

export const DEFAULT_USER_GOALS: UserGoals = {
  dailyKcal: APP_CONFIG.defaultDailyKcal,
  proteinGrams: 120,
  carbsGrams: 230,
  fatGrams: 65,
  fiberGrams: 28,
  waterGoalGlasses: APP_CONFIG.defaultWaterGoal,
  scheduleMode: 'standard',
}
