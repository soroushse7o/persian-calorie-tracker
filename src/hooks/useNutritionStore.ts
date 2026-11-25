import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import { idbGetMany, idbSet } from '../storage/idbAdapter'
import {
  analyzeBackupJson,
  applyBackupBundle,
  serializeBackupPayload,
  type BackupAnalysisResult,
  type BackupImportMode,
  type StoreDomainSnapshot,
} from '../store/backup'
import {
  buildEffectiveCatalog,
  mergeDefaultCatalog,
  upsertBuiltInOverride,
} from '../store/catalog'
import { recomputeUpdatedEntry } from '../store/entryMath'
import {
  normalizeGoals,
  sanitizeEntryList,
  sanitizeFoodList,
  sanitizeFoodOverrides,
  sanitizeImportedEntry,
  sanitizeImportedFood,
  sanitizeTemplateList,
  sanitizeWaterMap,
  sanitizeWeightList,
} from '../store/sanitizers'
import type {
  FoodItem,
  FoodOverrideRecord,
  LoggedFoodEntry,
  MealTemplate,
  MealType,
  ParsedFoodItem,
  ThemeMode,
  UserGoals,
  WeightEntry,
} from '../types/nutrition'
import { buildEntriesCsv } from '../utils/csvExport'
import { shiftDateKey } from '../utils/persianFormat'
import {
  STORAGE_KEYS,
  STORAGE_SCHEMA_VERSION,
  readStorageJson,
  requestPersistentStorage,
  runStorageMigrations,
  writeStorageJson,
} from '../utils/storageMigration'

export { mergeDefaultCatalog, sanitizeImportedEntry, sanitizeImportedFood }

const DAY_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * DAY_MS
const FOURTEEN_DAYS_MS = 14 * DAY_MS
const DEFAULT_BUILTIN_IDS = new Set(DEFAULT_IRANIAN_FOODS.map((f) => f.id))

const IDB_HYDRATION_KEYS = [
  STORAGE_KEYS.customFoods,
  STORAGE_KEYS.foodOverrides,
  STORAGE_KEYS.entries,
  STORAGE_KEYS.goals,
  STORAGE_KEYS.water,
  STORAGE_KEYS.weights,
  STORAGE_KEYS.templates,
] as const

export type BackupReminderLevel = 'none' | 'gentle' | 'urgent'

interface PreImportSnapshotEnvelope {
  savedAt: number
  snapshot: StoreDomainSnapshot
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function computeLoggingStreak(entries: LoggedFoodEntry[], todayKey: string): number {
  if (entries.length === 0) return 0
  const loggedDays = new Set(entries.map((e) => e.dateKey))

  let cursor = loggedDays.has(todayKey) ? todayKey : shiftDateKey(todayKey, -1)
  if (!loggedDays.has(cursor)) return 0

  let streak = 0
  while (loggedDays.has(cursor)) {
    streak++
    cursor = shiftDateKey(cursor, -1)
  }
  return streak
}

// Run deterministic v1 -> v2 -> v3 schema migration before initial state hydration
runStorageMigrations()

export function useNutritionStore() {
  const [customFoods, setCustomFoods] = useState<FoodItem[]>(() =>
    sanitizeFoodList(readStorageJson<unknown>(STORAGE_KEYS.customFoods, [])).map((f) => ({
      ...f,
      isCustom: true,
    })),
  )

  const [foodOverrides, setFoodOverrides] = useState<Record<string, FoodOverrideRecord>>(() =>
    sanitizeFoodOverrides(readStorageJson<unknown>(STORAGE_KEYS.foodOverrides, {})),
  )

  const foods = useMemo(
    () => buildEffectiveCatalog(customFoods, foodOverrides),
    [customFoods, foodOverrides],
  )

  const [entries, setEntries] = useState<LoggedFoodEntry[]>(() =>
    sanitizeEntryList(readStorageJson<unknown>(STORAGE_KEYS.entries, [])),
  )

  const [goals, setGoals] = useState<UserGoals>(() =>
    normalizeGoals(readStorageJson<Partial<UserGoals> | null>(STORAGE_KEYS.goals, null)),
  )

  const [waterByDate, setWaterByDate] = useState<Record<string, number>>(() =>
    sanitizeWaterMap(readStorageJson<unknown>(STORAGE_KEYS.water, {})),
  )

  const [weights, setWeights] = useState<WeightEntry[]>(() =>
    sanitizeWeightList(readStorageJson<unknown>(STORAGE_KEYS.weights, [])),
  )

  const [templates, setTemplates] = useState<MealTemplate[]>(() =>
    sanitizeTemplateList(readStorageJson<unknown>(STORAGE_KEYS.templates, [])),
  )

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const raw = readStorageJson<unknown>(STORAGE_KEYS.theme, null)
    return raw === 'light' ? 'light' : 'dark'
  })

  const [lastBackupAt, setLastBackupAt] = useState<number | null>(() => {
    const raw = readStorageJson<unknown>(STORAGE_KEYS.lastBackupAt, null)
    return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : null
  })

  const [preImportSavedAt, setPreImportSavedAt] = useState<number | null>(() => {
    const raw = readStorageJson<PreImportSnapshotEnvelope | null>(
      STORAGE_KEYS.preImportSnapshot,
      null,
    )
    return raw && typeof raw.savedAt === 'number' ? raw.savedAt : null
  })

  const [storageError, setStorageError] = useState<string | null>(null)
  const [persistenceState, setPersistenceState] = useState<
    'checking' | 'persisted' | 'not_persisted' | 'unsupported'
  >('checking')

  const entriesRef = useRef<LoggedFoodEntry[]>(entries)
  const foodsRef = useRef<FoodItem[]>(foods)
  const snapshotRef = useRef<StoreDomainSnapshot>({
    customFoods,
    foodOverrides,
    entries,
    goals,
    waterByDate,
    weights,
    templates,
  })
  const hydratedKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    foodsRef.current = foods
  }, [foods])

  useEffect(() => {
    snapshotRef.current = {
      customFoods,
      foodOverrides,
      entries,
      goals,
      waterByDate,
      weights,
      templates,
    }
  }, [customFoods, entries, foodOverrides, goals, templates, waterByDate, weights])

  // Primary IndexedDB Recovery & Bidirectional Sync on mount:
  // If localStorage was evicted/empty while IndexedDB survived, automatically recover state;
  // conversely, if IndexedDB lacks keys present in localStorage, seed IndexedDB!
  useEffect(() => {
    let active = true
    void idbGetMany(IDB_HYDRATION_KEYS).then((idbMap) => {
      if (!active) return
      const snap = snapshotRef.current

      const idbEntries = sanitizeEntryList(idbMap[STORAGE_KEYS.entries])
      if (snap.entries.length === 0 && idbEntries.length > 0) {
        setEntries(idbEntries)
      } else if (snap.entries.length > 0 && idbEntries.length === 0) {
        void idbSet(STORAGE_KEYS.entries, snap.entries)
      }

      const idbCustom = sanitizeFoodList(idbMap[STORAGE_KEYS.customFoods]).map((f) => ({
        ...f,
        isCustom: true,
      }))
      if (snap.customFoods.length === 0 && idbCustom.length > 0) {
        setCustomFoods(idbCustom)
      } else if (snap.customFoods.length > 0 && idbCustom.length === 0) {
        void idbSet(STORAGE_KEYS.customFoods, snap.customFoods)
      }

      const idbOverrides = sanitizeFoodOverrides(idbMap[STORAGE_KEYS.foodOverrides])
      if (Object.keys(snap.foodOverrides).length === 0 && Object.keys(idbOverrides).length > 0) {
        setFoodOverrides(idbOverrides)
      } else if (
        Object.keys(snap.foodOverrides).length > 0 &&
        Object.keys(idbOverrides).length === 0
      ) {
        void idbSet(STORAGE_KEYS.foodOverrides, snap.foodOverrides)
      }

      const idbWeights = sanitizeWeightList(idbMap[STORAGE_KEYS.weights])
      if (snap.weights.length === 0 && idbWeights.length > 0) {
        setWeights(idbWeights)
      } else if (snap.weights.length > 0 && idbWeights.length === 0) {
        void idbSet(STORAGE_KEYS.weights, snap.weights)
      }

      const idbWater = sanitizeWaterMap(idbMap[STORAGE_KEYS.water])
      if (Object.keys(snap.waterByDate).length === 0 && Object.keys(idbWater).length > 0) {
        setWaterByDate(idbWater)
      } else if (Object.keys(snap.waterByDate).length > 0 && Object.keys(idbWater).length === 0) {
        void idbSet(STORAGE_KEYS.water, snap.waterByDate)
      }

      const idbTemplates = sanitizeTemplateList(idbMap[STORAGE_KEYS.templates])
      if (snap.templates.length === 0 && idbTemplates.length > 0) {
        setTemplates(idbTemplates)
      } else if (snap.templates.length > 0 && idbTemplates.length === 0) {
        void idbSet(STORAGE_KEYS.templates, snap.templates)
      }

      if (
        typeof window !== 'undefined' &&
        window.localStorage.getItem(STORAGE_KEYS.goals) === null &&
        idbMap[STORAGE_KEYS.goals]
      ) {
        setGoals(normalizeGoals(idbMap[STORAGE_KEYS.goals] as Partial<UserGoals>))
      } else {
        void idbSet(STORAGE_KEYS.goals, snap.goals)
      }
    })

    requestPersistentStorage().then((status) => {
      if (active) setPersistenceState(status)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'dark' ? '#0C0C0D' : '#F4F5F7')
    }
  }, [theme])

  const persistOnChange = useCallback(<T,>(key: string, value: T) => {
    if (!hydratedKeysRef.current.has(key)) {
      hydratedKeysRef.current.add(key)
      if (typeof window !== 'undefined' && window.localStorage.getItem(key) !== null) {
        return
      }
    }
    const res = writeStorageJson(key, value)
    // Always persist to IndexedDB even if localStorage hits 5MB quota!
    void idbSet(key, value)
    if (!res.ok) {
      const msg = res.error ?? 'خطا در ذخیره‌سازی محلی'
      queueMicrotask(() => setStorageError(msg))
    }
  }, [])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.customFoods, customFoods)
  }, [customFoods, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.foodOverrides, foodOverrides)
  }, [foodOverrides, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.entries, entries)
  }, [entries, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.goals, goals)
  }, [goals, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.water, waterByDate)
  }, [waterByDate, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.weights, weights)
  }, [weights, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.templates, templates)
  }, [templates, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.theme, theme)
  }, [theme, persistOnChange])

  useEffect(() => {
    if (lastBackupAt !== null) {
      persistOnChange(STORAGE_KEYS.lastBackupAt, lastBackupAt)
    }
  }, [lastBackupAt, persistOnChange])

  useEffect(() => {
    const handleStorageSync = (event: StorageEvent) => {
      if (!event.key || event.newValue === null) return
      try {
        const parsed: unknown = JSON.parse(event.newValue)
        switch (event.key) {
          case STORAGE_KEYS.customFoods: {
            setCustomFoods(sanitizeFoodList(parsed).map((f) => ({ ...f, isCustom: true })))
            break
          }
          case STORAGE_KEYS.foodOverrides: {
            setFoodOverrides(sanitizeFoodOverrides(parsed))
            break
          }
          case STORAGE_KEYS.entries: {
            setEntries(sanitizeEntryList(parsed))
            break
          }
          case STORAGE_KEYS.goals: {
            setGoals(normalizeGoals(parsed as Partial<UserGoals>))
            break
          }
          case STORAGE_KEYS.water: {
            setWaterByDate(sanitizeWaterMap(parsed))
            break
          }
          case STORAGE_KEYS.weights: {
            setWeights(sanitizeWeightList(parsed))
            break
          }
          case STORAGE_KEYS.templates: {
            setTemplates(sanitizeTemplateList(parsed))
            break
          }
          case STORAGE_KEYS.theme: {
            if (parsed === 'dark' || parsed === 'light') setTheme(parsed)
            break
          }
          case STORAGE_KEYS.lastBackupAt: {
            if (typeof parsed === 'number' && Number.isFinite(parsed)) setLastBackupAt(parsed)
            break
          }
          default:
            break
        }
      } catch {
        // Ignore malformed external tab JSON
      }
    }

    window.addEventListener('storage', handleStorageSync)
    return () => window.removeEventListener('storage', handleStorageSync)
  }, [])

  const [mountNow] = useState(() => Date.now())

  const unbackedEntriesCount = useMemo(() => {
    if (lastBackupAt === null) return entries.length
    return entries.filter((e) => e.timestamp > lastBackupAt).length
  }, [entries, lastBackupAt])

  const backupReminderLevel = useMemo<BackupReminderLevel>(() => {
    if (entries.length < 5 || unbackedEntriesCount === 0) return 'none'
    const distinctDays = new Set(entries.map((e) => e.dateKey)).size

    if (lastBackupAt === null) {
      if (entries.length >= 20 || distinctDays >= 5) return 'urgent'
      if (distinctDays >= 2 || entries.length >= 8) return 'gentle'
      return 'none'
    }

    const elapsed = mountNow - lastBackupAt
    if (elapsed >= FOURTEEN_DAYS_MS && unbackedEntriesCount >= 5) return 'urgent'
    if (elapsed >= SEVEN_DAYS_MS && unbackedEntriesCount >= 1) return 'gentle'
    return 'none'
  }, [entries, lastBackupAt, mountNow, unbackedEntriesCount])

  const shouldRemindBackup = backupReminderLevel !== 'none'

  const logParsedItems = useCallback(
    (
      parsedItems: ParsedFoodItem[],
      mealType: MealType,
      dateKey: string,
      sourceText?: string,
    ): LoggedFoodEntry[] => {
      const now = Date.now()
      const newEntries: LoggedFoodEntry[] = parsedItems.map((item, idx) => ({
        id: generateId(`log-${idx}`),
        dateKey,
        timestamp: now + idx,
        mealType,
        foodId: item.food.id,
        foodName: item.food.name,
        quantity: item.quantity,
        unit: item.unit,
        totalGrams: item.totalGrams,
        kcal: item.kcal,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber ?? 0,
        ...(item.micronutrients ? { micronutrients: item.micronutrients } : {}),
        ...(item.modifierLabel ? { modifierLabel: item.modifierLabel } : {}),
        per100g: { ...item.food.per100g },
        sourceText,
      }))

      setEntries((prev) => [...newEntries, ...prev])
      return newEntries
    },
    [],
  )

  const deleteEntry = useCallback((entryId: string): LoggedFoodEntry | null => {
    const found = entriesRef.current.find((e) => e.id === entryId) ?? null
    if (found) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId))
    }
    return found
  }, [])

  const restoreEntry = useCallback((entry: LoggedFoodEntry) => {
    setEntries((prev) => {
      if (prev.some((e) => e.id === entry.id)) return prev
      return [entry, ...prev]
    })
  }, [])

  const updateEntry = useCallback(
    (entryId: string, patch: { quantity?: number; unit?: string; mealType?: MealType }) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? recomputeUpdatedEntry(entry, patch, foodsRef.current) : entry,
        ),
      )
    },
    [],
  )

  const repeatEntries = useCallback(
    (itemsToRepeat: LoggedFoodEntry[], targetMealType: MealType, targetDateKey: string) => {
      const now = Date.now()
      const cloned: LoggedFoodEntry[] = itemsToRepeat.map((item, idx) => ({
        ...item,
        id: generateId(`rep-${idx}`),
        dateKey: targetDateKey,
        mealType: targetMealType,
        timestamp: now + idx,
      }))
      setEntries((prev) => [...cloned, ...prev])
      return cloned
    },
    [],
  )

  const adjustWater = useCallback((dateKey: string, delta: number) => {
    setWaterByDate((prev) => {
      const current = prev[dateKey] ?? 0
      const next = Math.max(0, Math.min(30, current + delta))
      if (next === 0) {
        const copy = { ...prev }
        delete copy[dateKey]
        return copy
      }
      return { ...prev, [dateKey]: next }
    })
  }, [])

  const upsertWeight = useCallback((dateKey: string, weightKg: number) => {
    const cleanWeight = Math.round(Math.max(25, Math.min(300, weightKg)) * 10) / 10
    setWeights((prev) => {
      const filtered = prev.filter((w) => w.dateKey !== dateKey)
      return [...filtered, { dateKey, weightKg: cleanWeight, updatedAt: Date.now() }].sort((a, b) =>
        a.dateKey.localeCompare(b.dateKey),
      )
    })
  }, [])

  const deleteWeight = useCallback((dateKey: string) => {
    setWeights((prev) => prev.filter((w) => w.dateKey !== dateKey))
  }, [])

  const saveMealTemplate = useCallback(
    (name: string, mealType: MealType, groupEntries: LoggedFoodEntry[]): MealTemplate => {
      const created: MealTemplate = {
        id: generateId('tpl'),
        name: name.trim(),
        mealType,
        createdAt: Date.now(),
        items: groupEntries.map((e) => ({
          foodId: e.foodId,
          foodName: e.foodName,
          quantity: e.quantity,
          unit: e.unit,
          totalGrams: e.totalGrams,
          kcal: e.kcal,
          protein: e.protein,
          carbs: e.carbs,
          fat: e.fat,
          ...(typeof e.fiber === 'number' ? { fiber: e.fiber } : {}),
        })),
      }
      setTemplates((prev) => [created, ...prev])
      return created
    },
    [],
  )

  const deleteMealTemplate = useCallback((templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId))
  }, [])

  const applyMealTemplate = useCallback(
    (template: MealTemplate, targetDateKey: string, overrideMealType?: MealType) => {
      const now = Date.now()
      const mealType = overrideMealType ?? template.mealType
      const created: LoggedFoodEntry[] = template.items.map((item, idx) => ({
        ...item,
        id: generateId(`tpl-log-${idx}`),
        dateKey: targetDateKey,
        timestamp: now + idx,
        mealType,
      }))
      setEntries((prev) => [...created, ...prev])
      return created
    },
    [],
  )

  const addFood = useCallback((foodInput: Omit<FoodItem, 'id'>): FoodItem => {
    const hasGramUnit = foodInput.units.some((u) => u.name.trim() === 'گرم')
    const normalizedUnits = hasGramUnit
      ? foodInput.units
      : [...foodInput.units, { name: 'گرم', grams: 1 }]

    const created: FoodItem = {
      ...foodInput,
      id: generateId('food'),
      units: normalizedUnits,
      isCustom: true,
      source: foodInput.isRecipe ? 'دستور پخت شخصی کاربر' : 'غذای ثبت‌شده توسط کاربر',
      verified: false,
    }
    setCustomFoods((prev) => [created, ...prev])
    return created
  }, [])

  const updateFood = useCallback((updated: FoodItem) => {
    const hasGramUnit = updated.units.some((u) => u.name.trim() === 'گرم')
    const normalized: FoodItem = {
      ...updated,
      units: hasGramUnit ? updated.units : [...updated.units, { name: 'گرم', grams: 1 }],
    }

    if (DEFAULT_BUILTIN_IDS.has(normalized.id) && !normalized.isCustom) {
      setFoodOverrides((prev) => upsertBuiltInOverride(prev, normalized))
    } else {
      setCustomFoods((prev) =>
        prev.map((f) =>
          f.id === normalized.id
            ? {
                ...normalized,
                isCustom: true,
                source: normalized.isRecipe ? 'دستور پخت شخصی کاربر' : 'غذای ثبت‌شده توسط کاربر',
              }
            : f,
        ),
      )
    }
  }, [])

  const deleteFood = useCallback((foodId: string) => {
    setCustomFoods((prev) => prev.filter((f) => f.id !== foodId))
  }, [])

  const revertFoodOverride = useCallback((foodId: string) => {
    setFoodOverrides((prev) => {
      if (!prev[foodId]) return prev
      const next = { ...prev }
      delete next[foodId]
      return next
    })
  }, [])

  const resetDefaultFoods = useCallback((options?: { clearOverrides?: boolean }) => {
    if (options?.clearOverrides) {
      setFoodOverrides({})
    } else {
      setFoodOverrides((prev) => sanitizeFoodOverrides(prev))
    }
    setCustomFoods((prev) => sanitizeFoodList(prev).map((f) => ({ ...f, isCustom: true })))
  }, [])

  const updateGoals = useCallback((nextGoals: UserGoals) => {
    setGoals(normalizeGoals(nextGoals))
  }, [])

  const clearAllEntries = useCallback(() => {
    setEntries([])
    setWaterByDate({})
    setWeights([])
  }, [])

  const exportBackupJson = useCallback((): string => {
    const json = serializeBackupPayload(snapshotRef.current, foods, STORAGE_SCHEMA_VERSION)
    setLastBackupAt(Date.now())
    return json
  }, [foods])

  const exportEntriesCsv = useCallback((): string => {
    return buildEntriesCsv(entries, foods, goals.scheduleMode ?? 'standard', goals.customMealLabels)
  }, [entries, foods, goals.scheduleMode])

  const previewBackupJson = useCallback((rawJson: string): BackupAnalysisResult => {
    return analyzeBackupJson(rawJson)
  }, [])

  const importBackupJson = useCallback(
    (
      rawJson: string,
      mode: BackupImportMode = 'replace',
    ): { ok: boolean; error?: string; stats?: { foods: number; entries: number } } => {
      const analysis = analyzeBackupJson(rawJson)
      if (!analysis.ok) {
        return { ok: false, error: analysis.error }
      }

      const now = Date.now()
      const preEnvelope: PreImportSnapshotEnvelope = {
        savedAt: now,
        snapshot: snapshotRef.current,
      }
      const snapWrite = writeStorageJson(STORAGE_KEYS.preImportSnapshot, preEnvelope)
      void idbSet(STORAGE_KEYS.preImportSnapshot, preEnvelope)
      if (snapWrite.ok) {
        setPreImportSavedAt(now)
      }

      const next = applyBackupBundle(snapshotRef.current, analysis.bundle, mode)
      setCustomFoods(next.customFoods)
      setFoodOverrides(next.foodOverrides)
      setEntries(next.entries)
      setGoals(next.goals)
      setWaterByDate(next.waterByDate)
      setWeights(next.weights)
      setTemplates(next.templates)
      setLastBackupAt(now)

      const totalEffectiveFoods = DEFAULT_IRANIAN_FOODS.length + next.customFoods.length
      return {
        ok: true,
        stats: {
          foods: totalEffectiveFoods,
          entries: next.entries.length,
        },
      }
    },
    [],
  )

  const restorePreImportSnapshot = useCallback((): boolean => {
    const raw = readStorageJson<PreImportSnapshotEnvelope | null>(
      STORAGE_KEYS.preImportSnapshot,
      null,
    )
    if (!raw?.snapshot) return false
    setCustomFoods(
      sanitizeFoodList(raw.snapshot.customFoods).map((f) => ({ ...f, isCustom: true })),
    )
    setFoodOverrides(sanitizeFoodOverrides(raw.snapshot.foodOverrides))
    setEntries(sanitizeEntryList(raw.snapshot.entries))
    setGoals(normalizeGoals(raw.snapshot.goals))
    setWaterByDate(sanitizeWaterMap(raw.snapshot.waterByDate))
    setWeights(sanitizeWeightList(raw.snapshot.weights))
    setTemplates(sanitizeTemplateList(raw.snapshot.templates))
    return true
  }, [])

  return {
    foods,
    customFoodsCount: customFoods.length,
    overridesCount: Object.keys(foodOverrides).length,
    entries,
    goals,
    waterByDate,
    weights,
    templates,
    theme,
    lastBackupAt,
    preImportSavedAt,
    storageError,
    persistenceState,
    shouldRemindBackup,
    backupReminderLevel,
    unbackedEntriesCount,
    setTheme,
    dismissStorageError: () => setStorageError(null),
    logParsedItems,
    deleteEntry,
    restoreEntry,
    updateEntry,
    repeatEntries,
    adjustWater,
    upsertWeight,
    deleteWeight,
    saveMealTemplate,
    deleteMealTemplate,
    applyMealTemplate,
    addFood,
    updateFood,
    deleteFood,
    revertFoodOverride,
    resetDefaultFoods,
    updateGoals,
    clearAllEntries,
    exportBackupJson,
    exportEntriesCsv,
    previewBackupJson,
    importBackupJson,
    restorePreImportSnapshot,
  }
}
