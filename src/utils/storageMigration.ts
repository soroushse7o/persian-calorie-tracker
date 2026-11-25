import { CATALOG_VERSION, DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import { extractUserFoodLayer } from '../store/catalog'
import { sanitizeFoodList } from '../store/sanitizers'

export const STORAGE_SCHEMA_VERSION = 3

export const STORAGE_KEYS = {
  schemaVersion: 'kalorishomar_schema_version',
  /** Legacy v2 full catalog key (migrated to customFoods + foodOverrides in v3) */
  foods: 'kalorishomar_v2_foods',
  customFoods: 'kalorishomar_v3_custom_foods',
  foodOverrides: 'kalorishomar_v3_food_overrides',
  entries: 'kalorishomar_v2_entries',
  goals: 'kalorishomar_v2_goals',
  water: 'kalorishomar_v2_water',
  weights: 'kalorishomar_v2_weights',
  templates: 'kalorishomar_v2_templates',
  theme: 'kalorishomar_v2_theme',
  lastBackupAt: 'kalorishomar_v2_last_backup_at',
  preImportSnapshot: 'kalorishomar_v3_pre_import_snapshot',
  onboarding: 'kalorishomar_v3_onboarding',
  localMetrics: 'kalorishomar_v3_local_metrics',
  reminders: 'kalorishomar_v3_reminders',
} as const

const LEGACY_V1_MAP: Array<[v1Key: string, v2Key: string]> = [
  ['kalorishomar_v1_foods', STORAGE_KEYS.foods],
  ['kalorishomar_v1_entries', STORAGE_KEYS.entries],
  ['kalorishomar_v1_goals', STORAGE_KEYS.goals],
  ['kalorishomar_v1_water', STORAGE_KEYS.water],
]

export interface StorageWriteResult {
  ok: boolean
  error?: string
}

type MigratableStorage = Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<Storage, 'removeItem'>>

/**
 * Safely migrates v1 -> v2 -> v3 localStorage keys:
 * - v1 -> v2: copies `kalorishomar_v1_*` into `kalorishomar_v2_*` without data loss.
 * - v2 -> v3: splits full `kalorishomar_v2_foods` (~95KB) into compact user-only
 *   `kalorishomar_v3_custom_foods` + `kalorishomar_v3_food_overrides`, freeing quota
 *   and ensuring built-in foods come directly from code (`CATALOG_VERSION`).
 */
export function runStorageMigrations(
  storage: MigratableStorage | null =
    typeof window !== 'undefined' ? window.localStorage : null,
): void {
  if (!storage) return
  try {
    const rawVersion = storage.getItem(STORAGE_KEYS.schemaVersion)
    const currentVersion = rawVersion ? Number(rawVersion) : 0
    if (currentVersion >= STORAGE_SCHEMA_VERSION) return

    // Step 1: v0/v1 -> v2 key promotion
    if (currentVersion < 2) {
      for (const [v1Key, v2Key] of LEGACY_V1_MAP) {
        const existingV2 = storage.getItem(v2Key)
        const legacyV1 = storage.getItem(v1Key)
        if (!existingV2 && legacyV1) {
          storage.setItem(v2Key, legacyV1)
        }
      }
    }

    // Step 2: v2 -> v3 user-layer food extraction
    const existingV3Custom = storage.getItem(STORAGE_KEYS.customFoods)
    const existingV3Overrides = storage.getItem(STORAGE_KEYS.foodOverrides)
    const legacyV2FoodsRaw = storage.getItem(STORAGE_KEYS.foods)

    if (!existingV3Custom && !existingV3Overrides && legacyV2FoodsRaw) {
      try {
        const parsedLegacy = JSON.parse(legacyV2FoodsRaw) as unknown
        const cleanLegacy = sanitizeFoodList(parsedLegacy)
        const { customFoods, foodOverrides } = extractUserFoodLayer(
          cleanLegacy,
          DEFAULT_IRANIAN_FOODS,
          CATALOG_VERSION,
        )
        storage.setItem(STORAGE_KEYS.customFoods, JSON.stringify(customFoods))
        storage.setItem(STORAGE_KEYS.foodOverrides, JSON.stringify(foodOverrides))
        // Remove bulky redundant full-catalog v2 copy once v3 user-layer write succeeds
        storage.removeItem?.(STORAGE_KEYS.foods)
      } catch {
        // Keep legacyV2FoodsRaw untouched if JSON was malformed
      }
    }

    storage.setItem(STORAGE_KEYS.schemaVersion, String(STORAGE_SCHEMA_VERSION))
  } catch {
    // Migration error will be surfaced on next write if storage is locked/full
  }
}

export function readStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStorageJson<T>(key: string, value: T): StorageWriteResult {
  if (typeof window === 'undefined') return { ok: true }
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch (err) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22)
    return {
      ok: false,
      error: isQuota
        ? 'فضای ذخیره‌سازی مرورگر پر شده است! لطفاً فوراً یک فایل پشتیبان JSON دانلود کنید و برخی داده‌های قدیمی را پاک کنید.'
        : 'امکان ذخیره تغییرات در حافظه مرورگر وجود ندارد (ممکن است در حالت ناشناس/Private باشید). لطفاً پشتیبان JSON تهیه کنید.',
    }
  }
}

/** Collects a raw, crash-proof dump of all kalorishomar* keys in localStorage for Safe Mode recovery. */
export function dumpRawKaloriShomarStorage(
  storage: Storage | null = typeof window !== 'undefined' ? window.localStorage : null,
): Record<string, unknown> {
  const rawDump: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    safeModeRawDump: true,
    keys: {},
  }
  if (!storage) return rawDump
  const keysMap: Record<string, unknown> = {}
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (!k || !k.startsWith('kalorishomar')) continue
      const rawVal = storage.getItem(k)
      if (rawVal === null) continue
      try {
        keysMap[k] = JSON.parse(rawVal)
      } catch {
        // Keep exact raw string even when corrupted JSON caused a crash!
        keysMap[k] = { __corruptedRawString: rawVal }
      }
    }
  } catch {
    // Ignore restricted storage iteration errors
  }
  rawDump.keys = keysMap
  return rawDump
}

/** Clears all kalorishomar* keys from localStorage during explicit Safe Mode reset. */
export function clearAllKaloriShomarStorage(
  storage: Storage | null = typeof window !== 'undefined' ? window.localStorage : null,
): void {
  if (!storage) return
  try {
    const toRemove: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k && k.startsWith('kalorishomar')) {
        toRemove.push(k)
      }
    }
    for (const k of toRemove) {
      storage.removeItem(k)
    }
  } catch {
    // Ignore storage clear errors
  }
}

/** Requests durable/persistent browser storage so OS does not evict offline data under pressure. */
export async function requestPersistentStorage(): Promise<
  'persisted' | 'not_persisted' | 'unsupported'
> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return 'unsupported'
  }
  try {
    const already = navigator.storage.persisted ? await navigator.storage.persisted() : false
    if (already) return 'persisted'
    const granted = await navigator.storage.persist()
    return granted ? 'persisted' : 'not_persisted'
  } catch {
    return 'unsupported'
  }
}
