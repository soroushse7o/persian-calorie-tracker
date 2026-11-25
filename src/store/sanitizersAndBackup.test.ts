import { describe, expect, it } from 'vitest'
import { DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import { DEFAULT_USER_GOALS } from '../types/nutrition'
import {
  analyzeBackupJson,
  applyBackupBundle,
  serializeBackupPayload,
  type StoreDomainSnapshot,
} from './backup'
import {
  normalizeGoals,
  sanitizeFoodOverrides,
  sanitizeTemplateList,
  sanitizeWaterMap,
  sanitizeWeightList,
} from './sanitizers'

describe('Collection Sanitizers & Backup Import Preview / Merge / Replace', () => {
  it('sanitizes waterByDate, weights, templates, overrides, and goals against corrupted data', () => {
    const cleanWater = sanitizeWaterMap({
      '2026-11-20': 7.8,
      '2026-11-21': 99,
      '2026-11-22': -3,
      'bad-key': 5,
      '2026-11-23': 0,
    })
    expect(cleanWater).toEqual({ '2026-11-20': 8, '2026-11-21': 30 })

    const cleanWeights = sanitizeWeightList([
      { dateKey: '2026-11-22', weightKg: 74.24, updatedAt: 100 },
      { dateKey: '2026-11-22', weightKg: 74.6, updatedAt: 200 }, // newer wins
      { dateKey: '2026-11-20', weightKg: 75.1, updatedAt: 50 },
      { dateKey: '2026-11-19', weightKg: 5, updatedAt: 50 }, // out of range (<25)
      { dateKey: 'invalid', weightKg: 70, updatedAt: 50 },
      null,
    ])
    expect(cleanWeights).toEqual([
      { dateKey: '2026-11-20', weightKg: 75.1, updatedAt: 50 },
      { dateKey: '2026-11-22', weightKg: 74.6, updatedAt: 200 },
    ])

    const cleanTemplates = sanitizeTemplateList([
      {
        id: 'tpl-1',
        name: 'صبحانه کاری',
        mealType: 'breakfast',
        createdAt: 1000,
        items: [
          {
            foodId: 'boiled-egg',
            foodName: 'تخم‌مرغ آب‌پز',
            quantity: 2,
            unit: 'عدد',
            totalGrams: 110,
            kcal: 171,
            protein: 13.9,
            carbs: 1.2,
            fat: 11.7,
          },
        ],
      },
      { id: 'tpl-empty', name: 'خالی', mealType: 'lunch', items: [] },
      { id: '', name: 'بی‌نام', mealType: 'dinner', items: [{ foodName: 'سیب', kcal: 50 }] },
    ])
    expect(cleanTemplates).toHaveLength(1)
    expect(cleanTemplates[0].id).toBe('tpl-1')

    const overrides = sanitizeFoodOverrides({
      apple: {
        food: {
          id: 'apple',
          name: 'سیب سبز',
          aliases: [],
          category: 'drinks_snacks',
          per100g: { kcal: 50, protein: 0.3, carbs: 13, fat: 0.2 },
          defaultUnit: 'عدد',
          units: [{ name: 'عدد', grams: 140 }],
        },
        baseCatalogVersion: '2026.11.1',
        updatedAt: 500,
      },
      broken: { food: { id: 'broken', name: '' } },
    })
    expect(Object.keys(overrides)).toEqual(['apple'])
    expect(overrides.apple.food.isOverridden).toBe(true)

    expect(normalizeGoals({ dailyKcal: 500 }).dailyKcal).toBe(DEFAULT_USER_GOALS.dailyKcal)
    expect(normalizeGoals({ dailyKcal: 1350 }).dailyKcal).toBe(1350)
  })

  it('analyzes backup preview accurately and clears stale water/weights on replace when backup omits them', () => {
    const current: StoreDomainSnapshot = {
      customFoods: [
        {
          id: 'custom-existing',
          name: 'غذای قبلی',
          aliases: [],
          category: 'stews_mains',
          per100g: { kcal: 150, protein: 10, carbs: 15, fat: 5 },
          defaultUnit: 'پرس',
          units: [
            { name: 'پرس', grams: 200 },
            { name: 'گرم', grams: 1 },
          ],
          isCustom: true,
        },
      ],
      foodOverrides: {},
      entries: [
        {
          id: 'existing-1',
          dateKey: '2026-11-23',
          timestamp: 5000,
          mealType: 'lunch',
          foodId: 'ghormeh-sabzi',
          foodName: 'قورمه‌سبزی',
          quantity: 1,
          unit: 'کفگیر',
          totalGrams: 120,
          kcal: 174,
          protein: 10.2,
          carbs: 7.4,
          fat: 11.5,
        },
      ],
      goals: { dailyKcal: 2100, proteinGrams: 130, carbsGrams: 220, fatGrams: 70, waterGoalGlasses: 9 },
      waterByDate: { '2026-11-23': 6 },
      weights: [{ dateKey: '2026-11-23', weightKg: 78.4, updatedAt: 5000 }],
      templates: [],
    }

    // Legacy v1 backup WITHOUT waterByDate or weights
    const legacyBackupRaw = JSON.stringify({
      version: 1,
      exportedAt: '2026-11-15T10:00:00.000Z',
      goals: { dailyKcal: 1800, proteinGrams: 110, carbsGrams: 190, fatGrams: 60, waterGoalGlasses: 8 },
      foods: [DEFAULT_IRANIAN_FOODS[0]],
      entries: [
        {
          id: 'imp-1',
          dateKey: '2026-11-10',
          timestamp: 1000,
          mealType: 'breakfast',
          foodId: 'nan-sangak',
          foodName: 'نان سنگک',
          quantity: 2,
          unit: 'کف دست',
          totalGrams: 60,
          kcal: 155,
          protein: 5.4,
          carbs: 30.3,
          fat: 1.3,
        },
        {
          id: 'imp-2',
          dateKey: '2026-11-14',
          timestamp: 2000,
          mealType: 'dinner',
          foodId: 'boiled-egg',
          foodName: 'تخم‌مرغ آب‌پز',
          quantity: 2,
          unit: 'عدد',
          totalGrams: 110,
          kcal: 171,
          protein: 13.9,
          carbs: 1.2,
          fat: 11.7,
        },
      ],
    })

    const analysis = analyzeBackupJson(legacyBackupRaw)
    expect(analysis.ok).toBe(true)
    if (!analysis.ok) return

    expect(analysis.bundle.preview.entriesCount).toBe(2)
    expect(analysis.bundle.preview.minDateKey).toBe('2026-11-10')
    expect(analysis.bundle.preview.maxDateKey).toBe('2026-11-14')
    expect(analysis.bundle.preview.hasWaterField).toBe(false)
    expect(analysis.bundle.preview.hasWeightsField).toBe(false)

    // REPLACE mode MUST clear old waterByDate & weights when absent in backup!
    const replaced = applyBackupBundle(current, analysis.bundle, 'replace')
    expect(replaced.entries).toHaveLength(2)
    expect(replaced.customFoods).toHaveLength(0)
    expect(replaced.waterByDate).toEqual({})
    expect(replaced.weights).toEqual([])
    expect(replaced.goals.dailyKcal).toBe(1800)

    // MERGE mode preserves current data AND adds incoming entries without duplicates
    const merged = applyBackupBundle(current, analysis.bundle, 'merge')
    expect(merged.entries).toHaveLength(3)
    expect(merged.customFoods).toHaveLength(1)
    expect(merged.waterByDate).toEqual({ '2026-11-23': 6 })
    expect(merged.weights).toHaveLength(1)

    // Round-trip v3 serialization
    const serialized = serializeBackupPayload(merged, DEFAULT_IRANIAN_FOODS, 3)
    const reanalyzed = analyzeBackupJson(serialized)
    expect(reanalyzed.ok).toBe(true)
    if (reanalyzed.ok) {
      expect(reanalyzed.bundle.preview.entriesCount).toBe(3)
      expect(reanalyzed.bundle.preview.customFoodsCount).toBe(1)
    }

    expect(analyzeBackupJson('{not-json').ok).toBe(false)
    expect(analyzeBackupJson('{"foo":1}').ok).toBe(false)
  })
})
