import { describe, expect, it } from 'vitest'
import type { FoodItem } from '../types/nutrition'
import { STORAGE_KEYS, runStorageMigrations } from './storageMigration'

const CUSTOM_FOOD: FoodItem = {
  id: 'food-my-shake',
  name: 'شیک من',
  aliases: [],
  category: 'drinks_snacks',
  per100g: { kcal: 110, protein: 12, carbs: 10, fat: 2 },
  defaultUnit: 'لیوان',
  units: [
    { name: 'لیوان', grams: 250 },
    { name: 'گرم', grams: 1 },
  ],
  isCustom: true,
}

function makeStorage(failOnKey: string | null, initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  const setCalls: string[] = []
  const storage = {
    get length() {
      return store.size
    },
    key: (idx: number) => Array.from(store.keys())[idx] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      setCalls.push(k)
      if (k === failOnKey) throw new DOMException('quota', 'QuotaExceededError')
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
  } as Storage
  return { storage, store, setCalls }
}

function v2Storage(failOnKey: string | null, initial: Record<string, string> = {}) {
  return makeStorage(failOnKey, {
    [STORAGE_KEYS.schemaVersion]: '2',
    [STORAGE_KEYS.foods]: JSON.stringify([CUSTOM_FOOD]),
    ...initial,
  })
}

describe('Schema v2 -> v3 migration atomicity regression', () => {
  it('leaves the schema at version 2 and rolls back the first v3 key when the second v3 write fails', () => {
    const { storage, store } = v2Storage(STORAGE_KEYS.foodOverrides)

    runStorageMigrations(storage)

    expect(store.get(STORAGE_KEYS.schemaVersion)).toBe('2')
    expect(store.has(STORAGE_KEYS.customFoods)).toBe(false)
    expect(store.has(STORAGE_KEYS.foodOverrides)).toBe(false)
    // The bulky legacy catalog is retained so the migration can be retried.
    expect(store.has(STORAGE_KEYS.foods)).toBe(true)
  })

  it('leaves the schema at version 2 when the first v3 write itself fails', () => {
    const { storage, store } = v2Storage(STORAGE_KEYS.customFoods)

    runStorageMigrations(storage)

    expect(store.get(STORAGE_KEYS.schemaVersion)).toBe('2')
    expect(store.has(STORAGE_KEYS.customFoods)).toBe(false)
    expect(store.has(STORAGE_KEYS.foodOverrides)).toBe(false)
    expect(store.has(STORAGE_KEYS.foods)).toBe(true)
  })

  it('stamps version 3 only after both v3 keys were written successfully', () => {
    const { storage, store, setCalls } = v2Storage(null)

    runStorageMigrations(storage)

    expect(store.get(STORAGE_KEYS.schemaVersion)).toBe('3')
    expect(setCalls.indexOf(STORAGE_KEYS.customFoods)).toBeLessThan(
      setCalls.indexOf(STORAGE_KEYS.foodOverrides),
    )
    expect(setCalls.indexOf(STORAGE_KEYS.foodOverrides)).toBeLessThan(
      setCalls.indexOf(STORAGE_KEYS.schemaVersion),
    )
    expect(store.has(STORAGE_KEYS.foods)).toBe(false)
  })
})
