import { describe, expect, it } from 'vitest'
import { DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import { normalizeGoals, sanitizeImportedEntry, sanitizeImportedFood } from '../store/sanitizers'
import {
  DEFAULT_USER_GOALS,
  getMealTypeLabels,
  MICRONUTRIENT_SPECS,
} from '../types/nutrition'
import { evaluateTdeeGoals } from './calorieCalculator'
import {
  computeMacroEnergySplit,
  computeMicronutrientSummary,
  getPersonalizedDailyRef,
  resolveEntryMicronutrients,
  scaleMicronutrients,
  sumMicronutrients,
} from './micronutrients'
import { expandCompositeDishSegment, parsePersianFoodInput } from './persianFoodParser'

describe('v1.4.0 — Macronutrient, Micronutrient, Composite Dishes & Personalization Suite', () => {
  it('populates realistic micronutrients across all 322 built-in foods', () => {
    expect(DEFAULT_IRANIAN_FOODS.length).toBeGreaterThanOrEqual(320)
    for (const food of DEFAULT_IRANIAN_FOODS) {
      expect(food.per100g.micronutrients).toBeDefined()
      for (const spec of MICRONUTRIENT_SPECS) {
        const val = food.per100g.micronutrients?.[spec.key]
        expect(typeof val).toBe('number')
        expect(val).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('personalizes DRI benchmarks by sex & age (8mg male iron vs 18mg female iron) and computes TDEE fiber', () => {
    const ironSpec = MICRONUTRIENT_SPECS.find((s) => s.key === 'ironMg')!
    expect(getPersonalizedDailyRef(ironSpec, undefined)).toBe(18)
    expect(getPersonalizedDailyRef(ironSpec, { sex: 'male', ageYears: 28 })).toBe(8)
    expect(getPersonalizedDailyRef(ironSpec, { sex: 'female', ageYears: 28 })).toBe(18)
    expect(getPersonalizedDailyRef(ironSpec, { sex: 'female', ageYears: 55 })).toBe(8)

    const calciumSpec = MICRONUTRIENT_SPECS.find((s) => s.key === 'calciumMg')!
    expect(getPersonalizedDailyRef(calciumSpec, { sex: 'female', ageYears: 55 })).toBe(1200)

    const tdee = evaluateTdeeGoals({
      sex: 'male',
      ageYears: 26,
      heightCm: 180,
      weightKg: 80,
      activity: 'moderate',
      goal: 'gain',
    })
    expect(tdee.ok).toBe(true)
    if (tdee.ok) {
      expect(tdee.result.recommendedGoals.sex).toBe('male')
      expect(tdee.result.recommendedGoals.ageYears).toBe(26)
      expect(tdee.result.recommendedGoals.fiberGrams).toBeGreaterThanOrEqual(30)
    }

    const normalized = normalizeGoals({
      dailyKcal: 2100,
      proteinGrams: 140,
      carbsGrams: 220,
      fatGrams: 65,
      waterGoalGlasses: 9,
      scheduleMode: 'fasting_16_8',
      sex: 'male',
      ageYears: 29,
      targetWeightKg: 74.5,
    })
    expect(normalized.scheduleMode).toBe('fasting_16_8')
    expect(normalized.sex).toBe('male')
    expect(normalized.targetWeightKg).toBe(74.5)
    expect(getMealTypeLabels('fasting_16_8').breakfast).toContain('وعده اول')
  })

  it('expands composite Iranian dishes (چلوکباب کوبیده & نون و پنیر و گردو) and applies کم‌نمک low-sodium modifier', () => {
    expect(expandCompositeDishSegment('یک پرس چلوکباب کوبیده')).toHaveLength(2)

    const cheloKabab = parsePersianFoodInput(
      'یک پرس چلوکباب کوبیده و یک لیوان دوغ بی‌نمک',
      DEFAULT_IRANIAN_FOODS,
    )
    expect(cheloKabab.items).toHaveLength(3)
    expect(cheloKabab.items[0]?.food.id).toBe('berenj-abkesh')
    expect(cheloKabab.items[1]?.food.id).toBe('kabab-koobideh')
    expect(cheloKabab.items[1]?.quantity).toBe(2)

    const regularDoogh = parsePersianFoodInput('یک لیوان دوغ', DEFAULT_IRANIAN_FOODS)
    const lowSodiumDoogh = cheloKabab.items[2]!
    expect(lowSodiumDoogh.modifierLabel).toContain('کم‌نمک')
    expect(lowSodiumDoogh.micronutrients!.sodiumMg).toBeLessThan(
      regularDoogh.items[0]!.micronutrients!.sodiumMg * 0.5,
    )

    const nanPanir = parsePersianFoodInput('نون و پنیر و گردو کم‌نمک', DEFAULT_IRANIAN_FOODS)
    expect(nanPanir.items).toHaveLength(3)
  })

  it('scales, sums, and resolves micronutrients for both new and legacy logged entries', () => {
    expect(scaleMicronutrients(undefined, 150).ironMg).toBe(0)
    expect(scaleMicronutrients({ ironMg: 3 }, 0).ironMg).toBe(0)

    const parsed = parsePersianFoodInput(
      'دو کفگیر قورمه‌سبزی و یک کف دست سنگک و یک پرتقال',
      DEFAULT_IRANIAN_FOODS,
    )
    const combined = sumMicronutrients(parsed.items.map((i) => i.micronutrients))
    expect(combined.ironMg).toBeGreaterThan(7)
    expect(combined.vitaminCMg).toBeGreaterThan(50)

    const foodById = new Map(DEFAULT_IRANIAN_FOODS.map((f) => [f.id, f]))
    const legacyResolved = resolveEntryMicronutrients(
      {
        id: 'legacy-1',
        dateKey: '2026-11-24',
        timestamp: 1,
        mealType: 'lunch',
        foodId: 'adasi',
        foodName: 'عدسی',
        quantity: 1,
        unit: 'کاسه',
        totalGrams: 250,
        kcal: 290,
        protein: 18,
        carbs: 42,
        fat: 5,
      },
      foodById,
    )
    expect(legacyResolved.ironMg).toBeGreaterThan(7)
  })

  it('computes % DV with male/female profiles, sodium upper-limit alerts, and top contributing foods', () => {
    const foodById = new Map(DEFAULT_IRANIAN_FOODS.map((f) => [f.id, f]))

    const empty = computeMicronutrientSummary([], foodById)
    expect(empty.hasAnyIntake).toBe(false)

    const entries = [
      {
        id: '1',
        dateKey: '2026-11-24',
        timestamp: 1,
        mealType: 'lunch' as const,
        foodId: 'ghormeh-sabzi',
        foodName: 'خورش قورمه‌سبزی',
        quantity: 2.5,
        unit: 'کفگیر',
        totalGrams: 300,
        kcal: 450,
        protein: 27,
        carbs: 24,
        fat: 27,
      },
      {
        id: '2',
        dateKey: '2026-11-24',
        timestamp: 2,
        mealType: 'snack' as const,
        foodId: 'cheese-puffs',
        foodName: 'پفک نمکی',
        quantity: 3,
        unit: 'بسته',
        totalGrams: 270,
        kcal: 1400,
        protein: 16,
        carbs: 165,
        fat: 75,
      },
    ]

    const maleSummary = computeMicronutrientSummary(entries, foodById, 1, {
      sex: 'male',
      ageYears: 25,
    })
    const femaleSummary = computeMicronutrientSummary(entries, foodById, 1, {
      sex: 'female',
      ageYears: 25,
    })

    expect(maleSummary.profileLabel).toContain('آقا')
    const maleIron = maleSummary.items.find((i) => i.spec.key === 'ironMg')!
    const femaleIron = femaleSummary.items.find((i) => i.spec.key === 'ironMg')!
    expect(maleIron.pctOfRef).toBeGreaterThan(femaleIron.pctOfRef)
    expect(maleIron.status).toBe('good')

    const sodiumRow = maleSummary.items.find((i) => i.spec.key === 'sodiumMg')!
    expect(sodiumRow.status).toBe('over_limit')

    const split = computeMacroEnergySplit(
      { kcal: 2000, protein: 125, carbs: 225, fat: 66.7 },
      DEFAULT_USER_GOALS,
    )
    expect(split.proteinPct + split.carbsPct + split.fatPct).toBe(100)

    const cleanFood = sanitizeImportedFood({
      id: 'f1',
      name: 'تست غنی‌شده',
      aliases: [],
      category: 'breakfast_dairy',
      per100g: {
        kcal: 120,
        protein: 8,
        carbs: 10,
        fat: 5,
        micronutrients: { ironMg: 4.5, calciumMg: 240 },
      },
      defaultUnit: 'لیوان',
      units: [{ name: 'لیوان', grams: 240 }],
    })
    expect(cleanFood?.per100g.micronutrients?.calciumMg).toBe(240)

    const cleanEntry = sanitizeImportedEntry({
      id: 'e1',
      dateKey: '2026-11-24',
      timestamp: 10,
      mealType: 'breakfast',
      foodId: 'f1',
      foodName: 'تست غنی‌شده',
      quantity: 1,
      unit: 'لیوان',
      totalGrams: 240,
      kcal: 288,
      protein: 19,
      carbs: 24,
      fat: 12,
      micronutrients: { calciumMg: 576 },
    })
    expect(cleanEntry?.micronutrients?.calciumMg).toBe(576)
  })
})
