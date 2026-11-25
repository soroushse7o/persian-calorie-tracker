import { describe, expect, it } from 'vitest'
import {
  computeLoggingStreak,
  mergeDefaultCatalog,
  sanitizeImportedEntry,
  sanitizeImportedFood,
} from '../hooks/useNutritionStore'
import type { FoodItem, LoggedFoodEntry } from '../types/nutrition'
import {
  formatFaNumber,
  formatJalaliDate,
  formatQuantityFa,
  getLastNDays,
  shiftDateKey,
  toAsciiDigits,
  toPersianDigits,
} from './persianFormat'
import { STORAGE_KEYS, runStorageMigrations } from './storageMigration'

describe('Persian Formatting & Jalali Date Utilities', () => {
  it('converts digits cleanly between Persian, Arabic-Indic, and ASCII', () => {
    expect(toPersianDigits('2026-11-22')).toBe('۲۰۲۶-۱۱-۲۲')
    expect(toAsciiDigits('۱۲۳٫۴ و ٥٦')).toBe('123٫4 و 56')
    expect(formatQuantityFa(2)).toBe('۲')
    expect(formatQuantityFa(1.5)).toBe('۱٫۵')
    expect(formatFaNumber(1575)).toContain('۵۷۵')
  })

  it('formats Jalali dates naturally in Persian reading order and generates 7-day slots', () => {
    const sample = new Date(2026, 10, 22, 12, 0, 0) // 1 Azar 1405
    const full = formatJalaliDate(sample, 'full')
    expect(full).toContain('آذر')
    expect(full).toContain('۱۴۰۵')

    const days = getLastNDays(7, sample)
    expect(days).toHaveLength(7)
    expect(days[6].isToday).toBe(true)
    expect(days[0].isToday).toBe(false)
    expect(shiftDateKey('2026-11-22', -1)).toBe('2026-11-21')
  })
})

describe('Store Migration, Import Sanitizers & Streak Helpers', () => {
  it('merges newly added default foods without overwriting custom or edited foods', () => {
    const editedGhormeh: FoodItem = {
      id: 'ghormeh-sabzi',
      name: 'قورمه‌سبزی مامان‌پز',
      aliases: [],
      category: 'stews_mains',
      per100g: { kcal: 160, protein: 9, carbs: 6, fat: 11 },
      defaultUnit: 'کفگیر',
      units: [
        { name: 'کفگیر', grams: 130 },
        { name: 'گرم', grams: 1 },
      ],
    }
    const merged = mergeDefaultCatalog([editedGhormeh])
    expect(merged.length).toBeGreaterThanOrEqual(70)
    expect(merged.find((f) => f.id === 'ghormeh-sabzi')?.name).toBe('قورمه‌سبزی مامان‌پز')
    expect(merged.find((f) => f.id === 'tahchin-morgh')).toBeDefined()
  })

  it('sanitizes untrusted imported JSON foods and entries against missing arrays, invalid mealType, or NaN', () => {
    const food = sanitizeImportedFood({
      id: 'custom-ash',
      name: 'آش محلی',
      // missing aliases & invalid category & missing گرم unit
      category: 'unknown_cat',
      per100g: { kcal: 120, protein: Number.NaN, carbs: 18, fat: 4 },
      defaultUnit: 'کاسه',
      units: [{ name: 'کاسه', grams: 250 }],
      isCustom: true,
    })
    expect(food).not.toBeNull()
    expect(food?.aliases).toEqual([])
    expect(food?.category).toBe('stews_mains')
    expect(food?.per100g.protein).toBe(0)
    expect(food?.units.some((u) => u.name === 'گرم')).toBe(true)

    expect(sanitizeImportedFood({ id: 'bad', name: 'بدون کالری', per100g: { kcal: 0 } })).toBeNull()

    const entry = sanitizeImportedEntry({
      id: 'entry-1',
      dateKey: '2026-11-22',
      mealType: 'midnight_feast', // invalid mealType -> fallback to snack
      foodName: 'سیب',
      kcal: 78.4,
      protein: Number.NaN,
    })
    expect(entry).not.toBeNull()
    expect(entry?.mealType).toBe('snack')
    expect(entry?.kcal).toBe(78)
    expect(entry?.protein).toBe(0)

    expect(sanitizeImportedEntry({ id: 'bad-date', dateKey: '1405/09/01', foodName: 'سیب', kcal: 50 })).toBeNull()
  })

  it('migrates legacy v1 localStorage keys cleanly to v3 schema', () => {
    const store = new Map<string, string>([
      ['kalorishomar_v1_entries', JSON.stringify([{ id: 'e1' }])],
      ['kalorishomar_v1_goals', JSON.stringify({ dailyKcal: 1900 })],
    ])
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
    }

    runStorageMigrations(mockStorage)
    expect(store.get(STORAGE_KEYS.schemaVersion)).toBe('3')
    expect(store.get(STORAGE_KEYS.entries)).toBe(JSON.stringify([{ id: 'e1' }]))
    expect(store.get(STORAGE_KEYS.goals)).toBe(JSON.stringify({ dailyKcal: 1900 }))
  })

  it('computes consecutive daily logging streak accurately', () => {
    const mk = (dateKey: string): LoggedFoodEntry => ({
      id: dateKey,
      dateKey,
      timestamp: Date.now(),
      mealType: 'lunch',
      foodId: 'ghormeh-sabzi',
      foodName: 'قورمه‌سبزی',
      quantity: 1,
      unit: 'کفگیر',
      totalGrams: 120,
      kcal: 174,
      protein: 10,
      carbs: 7,
      fat: 11,
    })

    const entries = [mk('2026-11-22'), mk('2026-11-21'), mk('2026-11-20'), mk('2026-11-18')]
    expect(computeLoggingStreak(entries, '2026-11-22')).toBe(3)
    expect(computeLoggingStreak([], '2026-11-22')).toBe(0)
  })
})
