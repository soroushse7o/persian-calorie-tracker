import { describe, expect, it } from 'vitest'
import { evaluateDueReminder, type LocalReminderSettings } from './localReminders'

const settings: LocalReminderSettings = {
  enabled: true,
  dinnerHour: 20,
  waterIntervalMin: 120,
}

const baseParams = {
  settings,
  nowMs: 1_700_000_000_000,
  currentHour: 12,
  todayKey: '2026-11-25',
  hasLoggedDinnerToday: false,
  waterGlassesToday: 2,
  waterGoalGlasses: 8,
}

describe('Hydration reminder first trigger', () => {
  it('fires once even when lastWaterRemindedAt was never set', () => {
    const due = evaluateDueReminder(baseParams)
    expect(due).not.toBeNull()
    if (!due) return
    expect(due.message).toContain('آب')
    expect(due.updatedSettings.lastWaterRemindedAt).toBe(baseParams.nowMs)

    // After it fires, it must not repeat before the configured interval elapses.
    const again = evaluateDueReminder({
      ...baseParams,
      nowMs: baseParams.nowMs + 30 * 60_000,
      settings: due.updatedSettings,
    })
    expect(again).toBeNull()
  })

  it('fires again once the interval has elapsed', () => {
    const due = evaluateDueReminder({
      ...baseParams,
      nowMs: baseParams.nowMs + 130 * 60_000,
      settings: { ...settings, lastWaterRemindedAt: baseParams.nowMs },
    })
    expect(due).not.toBeNull()
  })
})
