import { describe, expect, it } from 'vitest'
import { normalizeGoals } from '../store/sanitizers'
import { getMealTypeLabels, getMealTypes, MEAL_BUDGET_RATIOS } from '../types/nutrition'

describe('Meal customization and extra snack slots', () => {
  it('exposes opt-in snack slots without changing the default set', () => {
    expect(getMealTypes(0)).toEqual(['breakfast', 'lunch', 'dinner', 'snack'])
    expect(getMealTypes(1)).toContain('snack2')
    expect(getMealTypes(2)).toContain('snack3')
    expect(MEAL_BUDGET_RATIOS.standard.snack2).toBeGreaterThan(0)
  })

  it('lets user labels override schedule-mode labels without losing other slots', () => {
    const labels = getMealTypeLabels('fasting_16_8', { breakfast: 'صبحانه من' })
    expect(labels.breakfast).toBe('صبحانه من')
    expect(labels.snack2).toBe('میان\u200cوعده دوم')
    expect(getMealTypeLabels('standard').lunch).toBe('ناهار')
  })

  it('normalizes and bounds persisted customization fields', () => {
    const goals = normalizeGoals({
      dailyKcal: 2000,
      proteinGrams: 120,
      carbsGrams: 230,
      fatGrams: 65,
      waterGoalGlasses: 8,
      extraSnackCount: 9,
      customMealLabels: { breakfast: ' صبحانه ', bogus: 'x', snack2: '' } as unknown as Partial<Record<string, string>>,
      quickFavorites: ['nan-sangak', 'nan-sangak', '', 123 as unknown as string],
    })
    expect(goals.extraSnackCount).toBe(2)
    expect(goals.customMealLabels?.breakfast).toBe('صبحانه')
    expect(goals.customMealLabels).not.toHaveProperty('bogus')
    expect(goals.customMealLabels).not.toHaveProperty('snack2')
    expect(goals.quickFavorites).toEqual(['nan-sangak'])
  })
})
