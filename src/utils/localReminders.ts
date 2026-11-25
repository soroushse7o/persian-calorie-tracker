import { STORAGE_KEYS } from './storageMigration'

export interface LocalReminderSettings {
  enabled: boolean
  /** Evening dinner check hour (0..23), e.g. 20 for 20:00 */
  dinnerHour: number
  /** Gentle hydration reminder interval in minutes while active (0 = disabled) */
  waterIntervalMin: number
  lastDinnerRemindedDate?: string
  lastWaterRemindedAt?: number
}

export const DEFAULT_REMINDER_SETTINGS: LocalReminderSettings = {
  enabled: false,
  dinnerHour: 20,
  waterIntervalMin: 120,
}

export function readReminderSettings(
  storage: Pick<Storage, 'getItem'> | null =
    typeof window !== 'undefined' ? window.localStorage : null,
): LocalReminderSettings {
  if (!storage) return DEFAULT_REMINDER_SETTINGS
  try {
    const raw = storage.getItem(STORAGE_KEYS.reminders)
    if (!raw) return DEFAULT_REMINDER_SETTINGS
    const parsed = JSON.parse(raw) as Partial<LocalReminderSettings>
    if (!parsed || typeof parsed !== 'object') return DEFAULT_REMINDER_SETTINGS
    return {
      enabled: Boolean(parsed.enabled),
      dinnerHour:
        typeof parsed.dinnerHour === 'number' && parsed.dinnerHour >= 17 && parsed.dinnerHour <= 23
          ? Math.round(parsed.dinnerHour)
          : DEFAULT_REMINDER_SETTINGS.dinnerHour,
      waterIntervalMin:
        typeof parsed.waterIntervalMin === 'number' && parsed.waterIntervalMin >= 0
          ? Math.min(360, Math.round(parsed.waterIntervalMin))
          : DEFAULT_REMINDER_SETTINGS.waterIntervalMin,
      lastDinnerRemindedDate:
        typeof parsed.lastDinnerRemindedDate === 'string'
          ? parsed.lastDinnerRemindedDate
          : undefined,
      lastWaterRemindedAt:
        typeof parsed.lastWaterRemindedAt === 'number' ? parsed.lastWaterRemindedAt : undefined,
    }
  } catch {
    return DEFAULT_REMINDER_SETTINGS
  }
}

export function writeReminderSettings(
  settings: LocalReminderSettings,
  storage: Pick<Storage, 'setItem'> | null =
    typeof window !== 'undefined' ? window.localStorage : null,
): void {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEYS.reminders, JSON.stringify(settings))
  } catch {
    // Ignore
  }
}

export async function requestNotificationPermissionIfNeeded(): Promise<
  'granted' | 'denied' | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const res = await Notification.requestPermission()
    return res === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

export function evaluateDueReminder(params: {
  settings: LocalReminderSettings
  nowMs: number
  currentHour: number
  todayKey: string
  hasLoggedDinnerToday: boolean
  waterGlassesToday: number
  waterGoalGlasses: number
}): { message: string; updatedSettings: LocalReminderSettings } | null {
  const { settings } = params
  if (!settings.enabled) return null

  // 1. Evening meal reminder (once per day if dinner not yet logged)
  if (
    params.currentHour >= settings.dinnerHour &&
    !params.hasLoggedDinnerToday &&
    settings.lastDinnerRemindedDate !== params.todayKey
  ) {
    return {
      message: 'یادآور دوستانه: اگر شام یا وعده عصرانه میل کرده‌اید، در چند ثانیه ثبتش کنید.',
      updatedSettings: {
        ...settings,
        lastDinnerRemindedDate: params.todayKey,
      },
    }
  }

  // 2. Hydration reminder during daytime (09:00 .. 22:00) if below goal
  if (
    settings.waterIntervalMin >= 30 &&
    params.currentHour >= 9 &&
    params.currentHour < 22 &&
    params.waterGlassesToday < params.waterGoalGlasses
  ) {
    const intervalMs = settings.waterIntervalMin * 60_000
    const lastWater = settings.lastWaterRemindedAt ?? 0
    if (lastWater === 0 || params.nowMs - lastWater >= intervalMs) {
      return {
        message: 'یادآور نوشیدن آب: یک لیوان آب بنوشید تا بدنتان شاداب بماند.',
        updatedSettings: {
          ...settings,
          lastWaterRemindedAt: params.nowMs,
        },
      }
    }
  }

  return null
}

export function dispatchLocalNotification(title: string, body: string): void {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/icons/icon-192.png', dir: 'rtl', lang: 'fa' })
    } catch {
      // Fallback handled by in-app toast
    }
  }
}
