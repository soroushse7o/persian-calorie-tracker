import { useState } from 'react'
import type { BackupAnalysisResult, BackupImportMode } from '../store/backup'
import type { LoggedFoodEntry, ThemeMode, UserGoals } from '../types/nutrition'
import type { PwaStatus } from '../utils/pwa'
import { AboutAndBetaSection } from './settings/AboutAndBetaSection'
import { BackupAndDataSection } from './settings/BackupAndDataSection'
import { GoalsAndCalculatorSection } from './settings/GoalsAndCalculatorSection'
import { PreferencesAndRemindersSection } from './settings/PreferencesAndRemindersSection'

interface SettingsTabProps {
  goals: UserGoals
  foodsCount: number
  customFoodsCount: number
  overridesCount: number
  entries: LoggedFoodEntry[]
  theme: ThemeMode
  lastBackupAt: number | null
  preImportSavedAt: number | null
  persistenceState: 'checking' | 'persisted' | 'not_persisted' | 'unsupported'
  pwaStatus: PwaStatus
  initialOpenCalculator?: boolean
  onThemeChange: (next: ThemeMode) => void
  onUpdateGoals: (goals: UserGoals) => void
  onExportJson: () => string
  onExportCsv: () => string
  onPreviewBackupJson: (raw: string) => BackupAnalysisResult
  onImportJson: (
    raw: string,
    mode: BackupImportMode,
  ) => { ok: boolean; error?: string; stats?: { foods: number; entries: number } }
  onRestorePreImportSnapshot: () => boolean
  onResetDefaultFoods: (options?: { clearOverrides?: boolean }) => void
  onClearAllEntries: () => void
}

type SettingsSectionFilter = 'all' | 'goals' | 'preferences' | 'backup' | 'about'

const SECTION_TABS: ReadonlyArray<{ id: SettingsSectionFilter; label: string }> = [
  { id: 'all', label: 'همه بخش‌ها' },
  { id: 'goals', label: 'اهداف و محاسبه‌گر' },
  { id: 'backup', label: 'پشتیبان و داده‌ها' },
  { id: 'preferences', label: 'ظاهر، یادآور و نصب' },
  { id: 'about', label: 'منابع و بازخورد' },
]

/**
 * Clean, modularized SettingsTab (~115 lines instead of 1,649 lines) with 1-tap category filtering
 * so non-technical and mobile users can jump straight to Goals, Backup, Appearance, or Sources.
 */
export function SettingsTab({
  goals,
  foodsCount,
  customFoodsCount,
  overridesCount,
  entries,
  theme,
  lastBackupAt,
  preImportSavedAt,
  persistenceState,
  pwaStatus,
  initialOpenCalculator = false,
  onThemeChange,
  onUpdateGoals,
  onExportJson,
  onExportCsv,
  onPreviewBackupJson,
  onImportJson,
  onRestorePreImportSnapshot,
  onResetDefaultFoods,
  onClearAllEntries,
}: SettingsTabProps) {
  const [sectionFilter, setSectionFilter] = useState<SettingsSectionFilter>(
    initialOpenCalculator ? 'goals' : 'all',
  )

  return (
    <div className="space-y-4 animate-fade-up" data-testid="settings-tab">
      {/* Quick Section Filter Strip */}
      <nav
        aria-label="دسته‌بندی بخش‌های تنظیمات"
        data-testid="settings-section-nav"
        className="card-surface rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar"
      >
        {SECTION_TABS.map((tab) => {
          const active = sectionFilter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`settings-filter-${tab.id}`}
              onClick={() => setSectionFilter(tab.id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                active
                  ? 'bg-emerald-500 text-[#051B11] font-bold'
                  : 'bg-[#1E1E22] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      {(sectionFilter === 'all' || sectionFilter === 'goals') && (
        <GoalsAndCalculatorSection
          goals={goals}
          initialOpenCalculator={initialOpenCalculator}
          onUpdateGoals={onUpdateGoals}
        />
      )}

      {(sectionFilter === 'all' || sectionFilter === 'preferences') && (
        <PreferencesAndRemindersSection
          theme={theme}
          pwaStatus={pwaStatus}
          onThemeChange={onThemeChange}
        />
      )}

      {(sectionFilter === 'all' || sectionFilter === 'backup') && (
        <BackupAndDataSection
          foodsCount={foodsCount}
          customFoodsCount={customFoodsCount}
          overridesCount={overridesCount}
          entries={entries}
          lastBackupAt={lastBackupAt}
          preImportSavedAt={preImportSavedAt}
          persistenceState={persistenceState}
          onExportJson={onExportJson}
          onExportCsv={onExportCsv}
          onPreviewBackupJson={onPreviewBackupJson}
          onImportJson={onImportJson}
          onRestorePreImportSnapshot={onRestorePreImportSnapshot}
          onResetDefaultFoods={onResetDefaultFoods}
          onClearAllEntries={onClearAllEntries}
        />
      )}

      {(sectionFilter === 'all' || sectionFilter === 'about') && (
        <AboutAndBetaSection entries={entries} />
      )}
    </div>
  )
}
