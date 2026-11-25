function readPositiveInt(value: string | undefined, fallback: number, min: number, max: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.round(parsed)))
}

export const APP_CONFIG = {
  appName: import.meta.env.VITE_APP_NAME?.trim() || 'کالری‌شمار روزمره',
  siteUrl: import.meta.env.VITE_SITE_URL?.trim() || '',
  defaultDailyKcal: readPositiveInt(import.meta.env.VITE_DEFAULT_DAILY_KCAL, 2000, 1000, 6000),
  defaultWaterGoal: readPositiveInt(import.meta.env.VITE_DEFAULT_WATER_GOAL_GLASSES, 8, 4, 20),
  enablePwa: import.meta.env.VITE_ENABLE_PWA !== 'false',
  repoUrl:
    import.meta.env.VITE_REPO_URL?.trim() ||
    'https://github.com/soroushse7o/persian-calorie-tracker',
  authorUrl: 'https://github.com/soroushse7o',
} as const
