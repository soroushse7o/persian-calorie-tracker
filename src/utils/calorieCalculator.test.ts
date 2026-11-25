import { describe, expect, it } from 'vitest'
import {
  HEALTH_DISCLAIMERS,
  MIN_CALCULATOR_AGE,
  calculateRecommendedGoals,
  evaluateTdeeGoals,
  type TdeeInput,
} from './calorieCalculator'

describe('Mifflin-St Jeor Persian TDEE & Macro Calculator (18+ Safe)', () => {
  it('blocks minors under 18 from generating calorie or weight-loss targets', () => {
    expect(MIN_CALCULATOR_AGE).toBe(18)

    const age14 = evaluateTdeeGoals({
      sex: 'female',
      ageYears: 14,
      heightCm: 160,
      weightKg: 52,
      activity: 'moderate',
      goal: 'lose',
    })
    expect(age14.ok).toBe(false)
    if (!age14.ok) {
      expect(age14.error).toContain('۱۸')
    }

    const age17 = evaluateTdeeGoals({
      sex: 'male',
      ageYears: 17,
      heightCm: 175,
      weightKg: 70,
      activity: 'light',
      goal: 'lose',
    })
    expect(age17.ok).toBe(false)

    expect(() =>
      calculateRecommendedGoals({
        sex: 'male',
        ageYears: 16,
        heightCm: 170,
        weightKg: 65,
        activity: 'light',
        goal: 'lose',
      }),
    ).toThrow()
  })

  it('includes educational notice and special health group warnings (pregnancy, breastfeeding, eating disorders)', () => {
    expect(HEALTH_DISCLAIMERS.educationalNotice).toContain('آموزشی')
    expect(HEALTH_DISCLAIMERS.educationalNotice).toContain('پزشک')
    expect(HEALTH_DISCLAIMERS.specialGroupsWarning).toContain('بارداری')
    expect(HEALTH_DISCLAIMERS.specialGroupsWarning).toContain('شیردهی')
    expect(HEALTH_DISCLAIMERS.specialGroupsWarning).toContain('اختلالات خوردن')
  })

  it('computes realistic maintenance, cutting, and bulking goals for adult 18+ users', () => {
    const maintain = calculateRecommendedGoals({
      sex: 'male',
      ageYears: 30,
      heightCm: 178,
      weightKg: 78,
      activity: 'moderate',
      goal: 'maintain',
    })

    expect(maintain.bmr).toBe(1748)
    expect(maintain.tdee).toBe(2709)
    expect(maintain.recommendedGoals.dailyKcal).toBe(2710)
    expect(maintain.recommendedGoals.proteinGrams).toBeGreaterThanOrEqual(100)
    expect(maintain.recommendedGoals.waterGoalGlasses).toBeGreaterThanOrEqual(8)

    const lose = calculateRecommendedGoals({
      sex: 'male',
      ageYears: 30,
      heightCm: 178,
      weightKg: 78,
      activity: 'moderate',
      goal: 'lose',
    })
    expect(lose.recommendedGoals.dailyKcal).toBeLessThan(maintain.recommendedGoals.dailyKcal)
    expect(lose.recommendedGoals.dailyKcal).toBeGreaterThanOrEqual(1400)

    const gain = calculateRecommendedGoals({
      sex: 'male',
      ageYears: 18,
      heightCm: 178,
      weightKg: 70,
      activity: 'moderate',
      goal: 'gain',
    })
    expect(gain.recommendedGoals.dailyKcal).toBeGreaterThan(2200)
  })

  it('rejects non-finite body measurements and unknown enum values instead of returning NaN goals', () => {
    const valid: TdeeInput = {
      sex: 'male',
      ageYears: 30,
      heightCm: 178,
      weightKg: 78,
      activity: 'moderate',
      goal: 'maintain',
    }

    const invalidInputs: TdeeInput[] = [
      { ...valid, heightCm: Number.NaN },
      { ...valid, weightKg: Number.POSITIVE_INFINITY },
      { ...valid, activity: 'super' as unknown as TdeeInput['activity'] },
      { ...valid, goal: 'unknown' as unknown as TdeeInput['goal'] },
      { ...valid, sex: 'other' as unknown as TdeeInput['sex'] },
    ]

    for (const input of invalidInputs) {
      const result = evaluateTdeeGoals(input)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).not.toContain('NaN')
    }

    expect(() =>
      calculateRecommendedGoals({ ...valid, heightCm: Number.NaN }),
    ).toThrow()
  })

  it('enforces safe minimum daily calorie floor for adult female cutting goals', () => {
    const res = calculateRecommendedGoals({
      sex: 'female',
      ageYears: 28,
      heightCm: 158,
      weightKg: 50,
      activity: 'sedentary',
      goal: 'lose',
    })

    expect(res.recommendedGoals.dailyKcal).toBeGreaterThanOrEqual(1200)
    expect(res.recommendedGoals.proteinGrams).toBeGreaterThanOrEqual(55)
    expect(res.recommendedGoals.fatGrams).toBeGreaterThanOrEqual(35)
    expect(res.recommendedGoals.carbsGrams).toBeGreaterThan(0)
    expect(res.recommendedGoals.waterGoalGlasses).toBeGreaterThanOrEqual(6)
  })
})
