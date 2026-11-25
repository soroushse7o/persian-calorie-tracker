/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_SITE_URL?: string
  readonly VITE_DEFAULT_DAILY_KCAL?: string
  readonly VITE_DEFAULT_WATER_GOAL_GLASSES?: string
  readonly VITE_ENABLE_PWA?: string
  readonly VITE_REPO_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
