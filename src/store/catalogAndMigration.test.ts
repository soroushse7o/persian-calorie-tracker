import { describe, expect, it } from 'vitest'
import { CATALOG_VERSION, DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import type { FoodItem } from '../types/nutrition'
import {
  STORAGE_KEYS,
  clearAllKaloriShomarStorage,
  dumpRawKaloriShomarStorage,
  runStorageMigrations,
} from '../utils/storageMigration'
import {
  buildEffectiveCatalog,
  extractUserFoodLayer,
  isBuiltInFoodModified,
  upsertBuiltInOverride,
} from './catalog'

describe('Catalog Validation, User Overrides & Schema v3 Migration', () => {
  it('populates source and verified metadata on every food and validates 60+ high-use items', () => {
    expect(CATALOG_VERSION).toMatch(/^\d{4}\.\d+\.\d+$/)
    expect(DEFAULT_IRANIAN_FOODS.length).toBeGreaterThanOrEqual(315)

    for (const food of DEFAULT_IRANIAN_FOODS) {
      expect(typeof food.source).toBe('string')
      expect(food.source!.length).toBeGreaterThan(5)
      expect(typeof food.verified).toBe('boolean')
    }

    const verifiedFoods = DEFAULT_IRANIAN_FOODS.filter((f) => f.verified)
    expect(verifiedFoods.length).toBeGreaterThanOrEqual(60)
  })

  it('extracts only custom foods and modified overrides so built-in calorie fixes reach old users', () => {
    const staleLavash: FoodItem = {
      ...DEFAULT_IRANIAN_FOODS.find((f) => f.id === 'nan-lavash')!,
      // Simulate user did NOT edit ghormeh-sabzi, DID edit ghormeh-sabzi? No: simulate user edited ghormeh-sabzi,
      // while nan-sangak is unmodified!
    }
    expect(isBuiltInFoodModified(staleLavash, staleLavash)).toBe(false)

    const sangakDefault = DEFAULT_IRANIAN_FOODS.find((f) => f.id === 'nan-sangak')!
    const ghormehDefault = DEFAULT_IRANIAN_FOODS.find((f) => f.id === 'ghormeh-sabzi')!
    const userEditedGhormeh: FoodItem = {
      ...ghormehDefault,
      name: 'قورمه‌سبزی کم‌روغن خانگی',
      per100g: { kcal: 120, protein: 9.5, carbs: 6.2, fat: 6.0 },
    }
    const userCustomDish: FoodItem = {
      id: 'food-custom-1',
      name: 'کوکی جو دوسر خانگی',
      aliases: ['کوکی رژیمی'],
      category: 'drinks_snacks',
      per100g: { kcal: 340, protein: 9, carbs: 48, fat: 12 },
      defaultUnit: 'عدد',
      units: [
        { name: 'عدد', grams: 35 },
        { name: 'گرم', grams: 1 },
      ],
      isCustom: true,
    }

    const extracted = extractUserFoodLayer([
      sangakDefault, // unmodified built-in -> must NOT be stored as override
      userEditedGhormeh, // modified built-in -> stored in foodOverrides
      userCustomDish, // custom -> stored in customFoods
    ])

    expect(extracted.customFoods).toHaveLength(1)
    expect(extracted.customFoods[0].id).toBe('food-custom-1')
    expect(Object.keys(extracted.foodOverrides)).toEqual(['ghormeh-sabzi'])
    expect(extracted.foodOverrides['nan-sangak']).toBeUndefined()

    // Simulate future catalog release updating nan-sangak kcal from 258 -> 262:
    const nextReleaseDefaults = DEFAULT_IRANIAN_FOODS.map((f) =>
      f.id === 'nan-sangak' ? { ...f, per100g: { ...f.per100g, kcal: 262 } } : f,
    )
    const effective = buildEffectiveCatalog(
      extracted.customFoods,
      extracted.foodOverrides,
      nextReleaseDefaults,
    )

    // Unmodified built-in receives the new calorie fix automatically!
    expect(effective.find((f) => f.id === 'nan-sangak')?.per100g.kcal).toBe(262)
    // User's explicit override is preserved!
    const mergedGhormeh = effective.find((f) => f.id === 'ghormeh-sabzi')!
    expect(mergedGhormeh.per100g.kcal).toBe(120)
    expect(mergedGhormeh.isOverridden).toBe(true)
    // Custom food is preserved!
    expect(effective.find((f) => f.id === 'food-custom-1')?.isCustom).toBe(true)
  })

  it('automatically removes override when user edits built-in values back to default', () => {
    const apple = DEFAULT_IRANIAN_FOODS.find((f) => f.id === 'apple')!
    const modifiedApple: FoodItem = {
      ...apple,
      per100g: { ...apple.per100g, kcal: 60 },
    }
    const withOverride = upsertBuiltInOverride({}, modifiedApple)
    expect(withOverride.apple).toBeDefined()

    const reverted = upsertBuiltInOverride(withOverride, apple)
    expect(reverted.apple).toBeUndefined()
  })

  it('migrates v2 full catalog storage into compact v3 customFoods + foodOverrides and handles Safe Mode raw dump', () => {
    const ghormeh = DEFAULT_IRANIAN_FOODS.find((f) => f.id === 'ghormeh-sabzi')!
    const sangak = DEFAULT_IRANIAN_FOODS.find((f) => f.id === 'nan-sangak')!
    const store = new Map<string, string>([
      [STORAGE_KEYS.schemaVersion, '2'],
      [
        STORAGE_KEYS.foods,
        JSON.stringify([
          sangak,
          { ...ghormeh, name: 'قورمه‌سبزی ویرایش‌شده' },
          {
            id: 'food-my-shake',
            name: 'شیک من',
            aliases: [],
            category: 'drinks_snacks',
            per100g: { kcal: 110, protein: 12, carbs: 10, fat: 2 },
            defaultUnit: 'لیوان',
            units: [{ name: 'لیوان', grams: 250 }],
            isCustom: true,
          },
        ]),
      ],
      ['kalorishomar_corrupted', '{broken-json'],
    ])

    const mockStorage = {
      get length() {
        return store.size
      },
      key: (idx: number) => Array.from(store.keys())[idx] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
      clear: () => store.clear(),
    } as Storage

    runStorageMigrations(mockStorage)

    expect(store.get(STORAGE_KEYS.schemaVersion)).toBe('3')
    expect(store.has(STORAGE_KEYS.foods)).toBe(false)

    const savedCustom = JSON.parse(store.get(STORAGE_KEYS.customFoods)!) as FoodItem[]
    const savedOverrides = JSON.parse(store.get(STORAGE_KEYS.foodOverrides)!) as Record<
      string,
      unknown
    >
    expect(savedCustom).toHaveLength(1)
    expect(savedCustom[0].id).toBe('food-my-shake')
    expect(Object.keys(savedOverrides)).toEqual(['ghormeh-sabzi'])

    // Safe Mode raw dump preserves corrupted string without throwing
    const rawDump = dumpRawKaloriShomarStorage(mockStorage)
    const keysObj = rawDump.keys as Record<string, unknown>
    expect(keysObj.kalorishomar_corrupted).toEqual({ __corruptedRawString: '{broken-json' })

    clearAllKaloriShomarStorage(mockStorage)
    expect(store.size).toBe(0)
  })
})
