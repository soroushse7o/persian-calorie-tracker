import { CATALOG_VERSION, DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import {
  DEFAULT_USER_GOALS,
  type AppBackupData,
  type FoodItem,
  type FoodOverrideRecord,
  type LoggedFoodEntry,
  type MealTemplate,
  type UserGoals,
  type WeightEntry,
} from '../types/nutrition'
import { extractUserFoodLayer } from './catalog'
import {
  MAX_ENTRIES,
  normalizeGoals,
  sanitizeEntryList,
  sanitizeFoodList,
  sanitizeFoodOverrides,
  sanitizeTemplateList,
  sanitizeWaterMap,
  sanitizeWeightList,
} from './sanitizers'

export type BackupImportMode = 'merge' | 'replace'

/** 30 MB of JSON text is far beyond any realistic personal backup; larger files are refused. */
export const MAX_BACKUP_JSON_CHARS = 30_000_000

export interface BackupPreview {
  version: number
  exportedAt: string | null
  entriesCount: number
  minDateKey: string | null
  maxDateKey: string | null
  customFoodsCount: number
  overridesCount: number
  totalFoodsInFile: number
  weightsCount: number
  hasWeightsField: boolean
  waterDaysCount: number
  hasWaterField: boolean
  templatesCount: number
  hasTemplatesField: boolean
  hasGoals: boolean
}

export interface ParsedBackupBundle {
  preview: BackupPreview
  customFoods: FoodItem[]
  foodOverrides: Record<string, FoodOverrideRecord>
  entries: LoggedFoodEntry[]
  waterByDate: Record<string, number>
  hasWaterField: boolean
  weights: WeightEntry[]
  hasWeightsField: boolean
  templates: MealTemplate[]
  hasTemplatesField: boolean
  goals: UserGoals
  hasGoals: boolean
}

export type BackupAnalysisResult =
  | { ok: true; bundle: ParsedBackupBundle }
  | { ok: false; error: string }

export interface StoreDomainSnapshot {
  customFoods: FoodItem[]
  foodOverrides: Record<string, FoodOverrideRecord>
  entries: LoggedFoodEntry[]
  goals: UserGoals
  waterByDate: Record<string, number>
  weights: WeightEntry[]
  templates: MealTemplate[]
}

/**
 * Parses and sanitizes a JSON backup string WITHOUT mutating state, returning
 * an accurate preview (entry count, date span, foods/overrides, water/weights presence)
 * for user confirmation before import.
 */
export function analyzeBackupJson(
  rawJson: string,
  defaults: FoodItem[] = DEFAULT_IRANIAN_FOODS,
): BackupAnalysisResult {
  if (rawJson.length > MAX_BACKUP_JSON_CHARS) {
    return {
      ok: false,
      error: 'فایل پشتیبان بیش از حد بزرگ است. لطفاً فایل معتبر دیگری انتخاب کنید.',
    }
  }

  let rawObj: unknown
  try {
    rawObj = JSON.parse(rawJson)
  } catch {
    return {
      ok: false,
      error: 'خطا در خواندن فایل JSON. لطفاً یک فایل پشتیبان معتبر انتخاب کنید.',
    }
  }

  if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) {
    return { ok: false, error: 'فرمت فایل پشتیبان معتبر نیست.' }
  }

  const parsed = rawObj as Partial<AppBackupData>
  if (Array.isArray(parsed.entries) && parsed.entries.length > MAX_ENTRIES) {
    return {
      ok: false,
      error: 'تعداد وعده‌های فایل پشتیبان بیش از حد مجاز است.',
    }
  }
  const hasLegacyFoodsArray = Array.isArray(parsed.foods)
  const hasV3Layer =
    Array.isArray(parsed.customFoods) ||
    (Boolean(parsed.foodOverrides) && typeof parsed.foodOverrides === 'object')

  if ((!hasLegacyFoodsArray && !hasV3Layer) || !Array.isArray(parsed.entries)) {
    return {
      ok: false,
      error: 'فایل انتخاب‌شده شامل ساختار صحیح غذاها و وعده‌ها نیست.',
    }
  }

  const entries = sanitizeEntryList(parsed.entries)

  let customFoods: FoodItem[] = []
  let foodOverrides: Record<string, FoodOverrideRecord> = {}
  let totalFoodsInFile = 0

  if (hasV3Layer) {
    customFoods = sanitizeFoodList(parsed.customFoods ?? []).map((f) => ({
      ...f,
      isCustom: true,
    }))
    foodOverrides = sanitizeFoodOverrides(parsed.foodOverrides ?? {})
    totalFoodsInFile = hasLegacyFoodsArray
      ? sanitizeFoodList(parsed.foods).length
      : defaults.length + customFoods.length
  } else {
    const cleanFoods = sanitizeFoodList(parsed.foods)
    if (cleanFoods.length === 0 && entries.length === 0) {
      return { ok: false, error: 'هیچ داده معتبری در فایل پشتیبان یافت نشد.' }
    }
    totalFoodsInFile = cleanFoods.length
    const extracted = extractUserFoodLayer(
      cleanFoods,
      defaults,
      typeof parsed.catalogVersion === 'string' ? parsed.catalogVersion : `backup-v${parsed.version ?? 2}`,
    )
    customFoods = extracted.customFoods
    foodOverrides = extracted.foodOverrides
  }

  const hasWaterField =
    parsed.waterByDate !== undefined &&
    parsed.waterByDate !== null &&
    typeof parsed.waterByDate === 'object' &&
    !Array.isArray(parsed.waterByDate)
  const waterByDate = hasWaterField ? sanitizeWaterMap(parsed.waterByDate) : {}

  const hasWeightsField = Array.isArray(parsed.weights)
  const weights = hasWeightsField ? sanitizeWeightList(parsed.weights) : []

  const hasTemplatesField = Array.isArray(parsed.templates)
  const templates = hasTemplatesField ? sanitizeTemplateList(parsed.templates) : []

  const hasGoals = Boolean(
    parsed.goals && typeof parsed.goals === 'object' && typeof parsed.goals.dailyKcal === 'number',
  )
  const goals = hasGoals ? normalizeGoals(parsed.goals) : DEFAULT_USER_GOALS

  let minDateKey: string | null = null
  let maxDateKey: string | null = null
  for (const e of entries) {
    if (minDateKey === null || e.dateKey < minDateKey) minDateKey = e.dateKey
    if (maxDateKey === null || e.dateKey > maxDateKey) maxDateKey = e.dateKey
  }

  const preview: BackupPreview = {
    version: typeof parsed.version === 'number' ? parsed.version : 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
    entriesCount: entries.length,
    minDateKey,
    maxDateKey,
    customFoodsCount: customFoods.length,
    overridesCount: Object.keys(foodOverrides).length,
    totalFoodsInFile,
    weightsCount: weights.length,
    hasWeightsField,
    waterDaysCount: Object.keys(waterByDate).length,
    hasWaterField,
    templatesCount: templates.length,
    hasTemplatesField,
    hasGoals,
  }

  return {
    ok: true,
    bundle: {
      preview,
      customFoods,
      foodOverrides,
      entries,
      waterByDate,
      hasWaterField,
      weights,
      hasWeightsField,
      templates,
      hasTemplatesField,
      goals,
      hasGoals,
    },
  }
}

function entrySignature(e: LoggedFoodEntry): string {
  return `${e.dateKey}|${e.mealType}|${e.foodId}|${e.quantity}|${e.unit}|${e.timestamp}`
}

/**
 * Applies a validated `ParsedBackupBundle` onto current store state using either:
 * - `'replace'`: Replaces all collections cleanly. If backup lacks `waterByDate`, `weights`,
 *   or `templates`, clears them to empty rather than leaving stale incompatible old data.
 * - `'merge'`: Non-destructively merges entries, custom foods, overrides, water, weights, and templates.
 */
export function applyBackupBundle(
  current: StoreDomainSnapshot,
  bundle: ParsedBackupBundle,
  mode: BackupImportMode,
): StoreDomainSnapshot {
  if (mode === 'replace') {
    return {
      customFoods: bundle.customFoods,
      foodOverrides: bundle.foodOverrides,
      entries: bundle.entries,
      goals: bundle.hasGoals ? bundle.goals : DEFAULT_USER_GOALS,
      waterByDate: bundle.hasWaterField ? bundle.waterByDate : {},
      weights: bundle.hasWeightsField ? bundle.weights : [],
      templates: bundle.hasTemplatesField ? bundle.templates : [],
    }
  }

  // Merge mode
  const customById = new Map<string, FoodItem>()
  for (const f of current.customFoods) customById.set(f.id, f)
  for (const f of bundle.customFoods) customById.set(f.id, f)

  const mergedOverrides: Record<string, FoodOverrideRecord> = {
    ...current.foodOverrides,
    ...bundle.foodOverrides,
  }

  const seenEntryIds = new Set<string>()
  const seenSignatures = new Set<string>()
  const mergedEntries: LoggedFoodEntry[] = []

  for (const list of [current.entries, bundle.entries]) {
    for (const e of list) {
      const sig = entrySignature(e)
      if (seenEntryIds.has(e.id) || seenSignatures.has(sig)) continue
      seenEntryIds.add(e.id)
      seenSignatures.add(sig)
      mergedEntries.push(e)
    }
  }
  mergedEntries.sort((a, b) => b.timestamp - a.timestamp)

  const mergedWater: Record<string, number> = { ...current.waterByDate }
  for (const [dateKey, count] of Object.entries(bundle.waterByDate)) {
    mergedWater[dateKey] = Math.max(mergedWater[dateKey] ?? 0, count)
  }

  const mergedWeights = sanitizeWeightList([...current.weights, ...bundle.weights])

  const tplById = new Map<string, MealTemplate>()
  for (const t of current.templates) tplById.set(t.id, t)
  for (const t of bundle.templates) tplById.set(t.id, t)

  return {
    customFoods: Array.from(customById.values()),
    foodOverrides: mergedOverrides,
    entries: mergedEntries,
    goals: bundle.hasGoals ? bundle.goals : current.goals,
    waterByDate: mergedWater,
    weights: mergedWeights,
    templates: Array.from(tplById.values()),
  }
}

export function serializeBackupPayload(
  snapshot: StoreDomainSnapshot,
  effectiveFoods: FoodItem[],
  schemaVersion: number,
): string {
  const payload: AppBackupData = {
    version: schemaVersion,
    exportedAt: new Date().toISOString(),
    catalogVersion: CATALOG_VERSION,
    goals: snapshot.goals,
    foods: effectiveFoods,
    customFoods: snapshot.customFoods,
    foodOverrides: snapshot.foodOverrides,
    entries: snapshot.entries,
    waterByDate: snapshot.waterByDate,
    weights: snapshot.weights,
    templates: snapshot.templates,
  }
  return JSON.stringify(payload, null, 2)
}
