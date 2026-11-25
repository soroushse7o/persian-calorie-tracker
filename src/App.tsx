import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Flame,
  Home,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldAlert,
  WifiOff,
  X,
} from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DailySummaryCard } from './components/DailySummaryCard'
import { JalaliCalendarPopover } from './components/JalaliCalendarPopover'
import { OnboardingCard } from './components/OnboardingCard'
import { QuickEntryBar } from './components/QuickEntryBar'
import { TodayMealsList } from './components/TodayMealsList'
import { APP_CONFIG } from './config/env'
import { computeLoggingStreak, useNutritionStore } from './hooks/useNutritionStore'
import {
  getMealTypeLabels,
  type AppTab,
  type FoodItem,
  type LoggedFoodEntry,
  type MacroValues,
  type MealTemplate,
  type MealType,
  type MicronutrientKey,
  type ParsedFoodItem,
} from './types/nutrition'
import { buildPersianDailyReport } from './utils/dailySummaryShare'
import {
  dispatchLocalNotification,
  evaluateDueReminder,
  readReminderSettings,
  writeReminderSettings,
} from './utils/localReminders'
import {
  dateFromKey,
  formatFaNumber,
  formatJalaliDate,
  getDefaultMealTypeForHour,
  getLocalDateKey,
  shiftDateKey,
} from './utils/persianFormat'
import { usePwaStatus } from './utils/pwa'
import { exportDailySummaryImage } from './utils/reportImageExport'

const loadWeeklyTrendsTab = () =>
  import('./components/WeeklyTrendsTab').then((m) => ({ default: m.WeeklyTrendsTab }))
const loadFoodDatabaseTab = () =>
  import('./components/FoodDatabaseTab').then((m) => ({ default: m.FoodDatabaseTab }))
const loadSettingsTab = () =>
  import('./components/SettingsTab').then((m) => ({ default: m.SettingsTab }))

const WeeklyTrendsTab = lazy(loadWeeklyTrendsTab)
const FoodDatabaseTab = lazy(loadFoodDatabaseTab)
const SettingsTab = lazy(loadSettingsTab)

const NAV_ITEMS: Array<{ id: AppTab; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'ثبت روزانه', icon: Home },
  { id: 'trends', label: 'روند و تاریخچه', icon: BarChart3 },
  { id: 'foods', label: 'بانک غذاها', icon: BookOpen },
  { id: 'settings', label: 'تنظیمات', icon: Settings },
]

interface ToastState {
  message: string
  undoEntry?: LoggedFoodEntry
}

export function App() {
  const {
    foods,
    customFoodsCount,
    overridesCount,
    entries,
    goals,
    waterByDate,
    weights,
    templates,
    theme,
    lastBackupAt,
    preImportSavedAt,
    storageError,
    persistenceState,
    shouldRemindBackup,
    backupReminderLevel,
    unbackedEntriesCount,
    setTheme,
    dismissStorageError,
    logParsedItems,
    deleteEntry,
    restoreEntry,
    updateEntry,
    repeatEntries,
    adjustWater,
    upsertWeight,
    deleteWeight,
    saveMealTemplate,
    deleteMealTemplate,
    applyMealTemplate,
    addFood,
    updateFood,
    deleteFood,
    revertFoodOverride,
    resetDefaultFoods,
    updateGoals,
    clearAllEntries,
    exportBackupJson,
    buildBackupJson,
    markBackedUp,
    exportEntriesCsv,
    previewBackupJson,
    importBackupJson,
    restorePreImportSnapshot,
  } = useNutritionStore()

  const pwaStatus = usePwaStatus()

  const [todayKey, setTodayKey] = useState<string>(getLocalDateKey)
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [openCalcOnSettings, setOpenCalcOnSettings] = useState(false)
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [quickInput, setQuickInput] = useState('')
  const [mealType, setMealType] = useState<MealType>(() => getDefaultMealTypeForHour())
  const [prefillNewFoodName, setPrefillNewFoodName] = useState<string | null>(null)
  const [prefillNewFoodBarcode, setPrefillNewFoodBarcode] = useState<string | null>(null)
  const [prefillNutrientFilter, setPrefillNutrientFilter] = useState<MicronutrientKey | null>(null)
  const [backupReminderDismissed, setBackupReminderDismissed] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const mealLabels = getMealTypeLabels(goals.scheduleMode, goals.customMealLabels)

  const showToast = useCallback((message: string, undoEntry?: LoggedFoodEntry) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
    }
    setToast({ message, undoEntry })
    toastTimerRef.current = window.setTimeout(
      () => {
        setToast(null)
        toastTimerRef.current = null
      },
      undoEntry ? 4500 : 2800,
    )
  }, [])

  // Lazy tab chunks are loaded on demand (nav hover/focus) and, after the first
  // real interaction, quietly during browser idle time — never on a fixed timer
  // that fires while the user is still reading the home screen.
  const preloadedTabsRef = useRef<Set<AppTab>>(new Set())
  const preloadTab = useCallback((tab: AppTab) => {
    if (tab === 'home' || preloadedTabsRef.current.has(tab)) return
    preloadedTabsRef.current.add(tab)
    if (tab === 'trends') void loadWeeklyTrendsTab()
    else if (tab === 'foods') void loadFoodDatabaseTab()
    else if (tab === 'settings') void loadSettingsTab()
  }, [])

  useEffect(() => {
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }
    const w = window as IdleWindow
    let cancelIdle: (() => void) | null = null

    const onFirstInteraction = () => {
      window.removeEventListener('pointerdown', onFirstInteraction)
      window.removeEventListener('keydown', onFirstInteraction)
      const warmRemaining = () => {
        preloadTab('trends')
        preloadTab('foods')
        preloadTab('settings')
      }
      if (typeof w.requestIdleCallback === 'function') {
        const handle = w.requestIdleCallback(warmRemaining, { timeout: 2500 })
        cancelIdle = () => w.cancelIdleCallback?.(handle)
      } else {
        const timer = window.setTimeout(warmRemaining, 1200)
        cancelIdle = () => window.clearTimeout(timer)
      }
    }

    window.addEventListener('pointerdown', onFirstInteraction, { once: true })
    window.addEventListener('keydown', onFirstInteraction, { once: true })
    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction)
      window.removeEventListener('keydown', onFirstInteraction)
      cancelIdle?.()
    }
  }, [preloadTab])

  useEffect(() => {
    const checkDateRollover = () => {
      const freshToday = getLocalDateKey()
      setTodayKey((prevToday) => {
        if (prevToday === freshToday) return prevToday
        setSelectedDateKey((prevSelected) =>
          prevSelected === prevToday ? freshToday : prevSelected,
        )
        return freshToday
      })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDateRollover()
      }
    }

    window.addEventListener('focus', checkDateRollover)
    document.addEventListener('visibilitychange', onVisibility)
    const intervalId = window.setInterval(checkDateRollover, 60_000)

    return () => {
      window.removeEventListener('focus', checkDateRollover)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(intervalId)
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  // Opt-in Local Reminder Evaluator (runs quietly every 60s when enabled)
  useEffect(() => {
    const checkReminders = () => {
      const settings = readReminderSettings()
      if (!settings.enabled) return
      const now = new Date()
      const tk = getLocalDateKey(now)
      const hasDinner = entries.some((e) => e.dateKey === tk && e.mealType === 'dinner')
      const waterToday = waterByDate[tk] ?? 0
      const due = evaluateDueReminder({
        settings,
        nowMs: now.getTime(),
        currentHour: now.getHours(),
        todayKey: tk,
        hasLoggedDinnerToday: hasDinner,
        waterGlassesToday: waterToday,
        waterGoalGlasses: goals.waterGoalGlasses,
      })
      if (due) {
        writeReminderSettings(due.updatedSettings)
        dispatchLocalNotification(APP_CONFIG.appName, due.message)
        showToast(due.message)
      }
    }

    const id = window.setInterval(checkReminders, 60_000)
    return () => window.clearInterval(id)
  }, [entries, goals.waterGoalGlasses, showToast, waterByDate])

  const isSelectedToday = selectedDateKey === todayKey

  const loggedDateKeys = useMemo(() => new Set(entries.map((e) => e.dateKey)), [entries])

  const selectedJalaliFull = useMemo(
    () => formatJalaliDate(dateFromKey(selectedDateKey), 'full'),
    [selectedDateKey],
  )

  const selectedDayShortLabel = useMemo(() => {
    if (selectedDateKey === todayKey) return 'امروز'
    if (selectedDateKey === shiftDateKey(todayKey, -1)) return 'دیروز'
    return formatJalaliDate(dateFromKey(selectedDateKey), 'medium')
  }, [selectedDateKey, todayKey])

  const dayEntries = useMemo(
    () => entries.filter((e) => e.dateKey === selectedDateKey),
    [entries, selectedDateKey],
  )

  const dailyConsumed = useMemo<MacroValues>(() => {
    return dayEntries.reduce(
      (acc, e) => ({
        kcal: acc.kcal + e.kcal,
        protein: Math.round((acc.protein + e.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + e.carbs) * 10) / 10,
        fat: Math.round((acc.fat + e.fat) * 10) / 10,
        fiber: Math.round(((acc.fiber ?? 0) + (e.fiber ?? 0)) * 10) / 10,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    )
  }, [dayEntries])

  const selectedWaterGlasses = waterByDate[selectedDateKey] ?? 0
  const streakDays = useMemo(() => computeLoggingStreak(entries, todayKey), [entries, todayKey])

  const handleQuickDownloadBackup = useCallback(() => {
    const json = exportBackupJson()
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kalorishomar-backup-${getLocalDateKey()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast('فایل پشتیبان JSON با موفقیت دانلود شد')
  }, [exportBackupJson, showToast])

  const handleSubmitQuickMeal = useCallback(
    (items: ParsedFoodItem[], chosenMealType: MealType, sourceText: string) => {
      const created = logParsedItems(items, chosenMealType, selectedDateKey, sourceText)
      const totalKcal = created.reduce((sum, item) => sum + item.kcal, 0)
      showToast(
        `${formatFaNumber(created.length)} مورد در ${mealLabels[chosenMealType]} ثبت شد (~${formatFaNumber(totalKcal)} کالری)`,
      )
    },
    [logParsedItems, mealLabels, selectedDateKey, showToast],
  )

  const handleDeleteEntry = useCallback(
    (entryId: string) => {
      const removed = deleteEntry(entryId)
      if (removed) {
        showToast(`«${removed.foodName}» حذف شد`, removed)
      }
    },
    [deleteEntry, showToast],
  )

  const handleUndoDelete = useCallback(() => {
    if (!toast?.undoEntry) return
    restoreEntry(toast.undoEntry)
    setToast(null)
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }, [restoreEntry, toast])

  const handleRepeatEntries = useCallback(
    (items: LoggedFoodEntry[], targetMealType: MealType) => {
      const cloned = repeatEntries(items, targetMealType, selectedDateKey)
      const totalKcal = cloned.reduce((sum, item) => sum + item.kcal, 0)
      showToast(
        `${mealLabels[targetMealType]} کپی شد (~${formatFaNumber(totalKcal)} کالری)`,
      )
    },
    [mealLabels, repeatEntries, selectedDateKey, showToast],
  )

  const handleSaveTemplate = useCallback(
    (name: string, targetMealType: MealType, items: LoggedFoodEntry[]) => {
      saveMealTemplate(name, targetMealType, items)
      showToast(`«${name}» به وعده‌های منتخب اضافه شد`)
    },
    [saveMealTemplate, showToast],
  )

  const handleApplyTemplate = useCallback(
    (template: MealTemplate) => {
      const created = applyMealTemplate(template, selectedDateKey, mealType)
      const totalKcal = created.reduce((sum, item) => sum + item.kcal, 0)
      showToast(`«${template.name}» ثبت شد (~${formatFaNumber(totalKcal)} کالری)`)
    },
    [applyMealTemplate, mealType, selectedDateKey, showToast],
  )

  const handleCopyDailyReport = useCallback(async (): Promise<boolean> => {
    const report = buildPersianDailyReport({
      appName: APP_CONFIG.appName,
      jalaliDateLabel: selectedJalaliFull,
      consumed: dailyConsumed,
      goals,
      waterGlasses: selectedWaterGlasses,
      entries: dayEntries,
    })

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report)
        showToast('گزارش کامل امروز در حافظه کپی شد')
        return true
      }
    } catch {
      // Fallback below
    }

    try {
      const ta = document.createElement('textarea')
      ta.value = report
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
      showToast('گزارش کامل امروز در حافظه کپی شد')
      return true
    } catch {
      showToast('امکان کپی خودکار گزارش وجود نداشت')
      return false
    }
  }, [dailyConsumed, dayEntries, goals, selectedJalaliFull, selectedWaterGlasses, showToast])

  const handleShareDailyImage = useCallback(async () => {
    const res = await exportDailySummaryImage(
      {
        appName: APP_CONFIG.appName,
        dateLabel: selectedJalaliFull,
        consumed: dailyConsumed,
        goals,
        waterGlasses: selectedWaterGlasses,
      },
      `kalorishomar-${selectedDateKey}.png`,
    )
    if (res === 'downloaded') {
      showToast('تصویر کارت روزانه ذخیره شد')
    } else if (res === 'failed') {
      showToast('امکان ساخت تصویر در این مرورگر وجود نداشت')
    }
  }, [dailyConsumed, goals, selectedDateKey, selectedJalaliFull, selectedWaterGlasses, showToast])

  const handleQuickUseFood = useCallback(
    (food: FoodItem) => {
      const phrase = `یک ${food.defaultUnit} ${food.name}`
      setQuickInput((prev) => (prev.trim() ? `${prev.trim()} و ${phrase}` : phrase))
      setActiveTab('home')
      showToast(`«${food.name}» به کادر ثبت سریع اضافه شد`)
    },
    [showToast],
  )

  const handleRequestAddCustomFood = useCallback((prefillName: string) => {
    setPrefillNewFoodName(prefillName)
    setPrefillNewFoodBarcode(null)
    setActiveTab('foods')
  }, [])

  const handleRequestAddBarcodeFood = useCallback((barcode: string) => {
    setPrefillNewFoodName('')
    setPrefillNewFoodBarcode(barcode)
    setActiveTab('foods')
  }, [])

  const handleAddFood = useCallback(
    (food: Omit<FoodItem, 'id'>) => {
      addFood(food)
      showToast(`«${food.name}» به بانک غذاها اضافه شد`)
    },
    [addFood, showToast],
  )

  const handleUpdateFood = useCallback(
    (food: FoodItem) => {
      updateFood(food)
      showToast(`تغییرات «${food.name}» ذخیره شد`)
    },
    [updateFood, showToast],
  )

  const handleDeleteFood = useCallback(
    (id: string) => {
      deleteFood(id)
      showToast('غذا از بانک حذف شد')
    },
    [deleteFood, showToast],
  )

  const handleRevertFoodOverride = useCallback(
    (id: string) => {
      revertFoodOverride(id)
      showToast('غذا به مقدار پیش‌فرض کاتالوگ بازگردانده شد')
    },
    [revertFoodOverride, showToast],
  )

  const handleSelectDateFromTrends = useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey)
    setActiveTab('home')
  }, [])

  const isUrgentBackup = backupReminderLevel === 'urgent'

  return (
    <div dir="rtl" className="min-h-dvh bg-[#0C0C0D] text-[#FAFAFA] flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-50 focus:rounded-xl focus:bg-emerald-500 focus:text-[#051B11] focus:font-bold focus:px-4 focus:py-2 focus:text-xs"
      >
        پرش به محتوای اصلی
      </a>

      {storageError && (
        <div
          role="alert"
          data-testid="storage-error-banner"
          className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2.5 text-xs flex flex-wrap items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2 text-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{storageError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickDownloadBackup}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-500 text-white font-bold px-2.5 py-1 text-[11px]"
            >
              <Download className="w-3 h-3" />
              <span>دانلود پشتیبان فوری</span>
            </button>
            <button
              type="button"
              onClick={dismissStorageError}
              aria-label="بستن هشدار حافظه"
              className="text-rose-200 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {pwaStatus.hasUpdate && (
        <div className="bg-amber-500/15 border-b border-amber-500/25 px-4 py-2 text-xs flex items-center justify-center gap-3">
          <span className="text-amber-200">نسخه جدید کالری‌شمار روزمره آماده است.</span>
          <button
            type="button"
            onClick={pwaStatus.applyUpdate}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 text-[#1A1202] font-bold px-2.5 py-1 text-[11px]"
          >
            <RefreshCw className="w-3 h-3" />
            <span>به‌روزرسانی</span>
          </button>
        </div>
      )}

      {shouldRemindBackup && !backupReminderDismissed && !storageError && (
        <div
          data-testid="weekly-backup-reminder"
          className={`border-b px-4 py-2.5 text-xs flex flex-wrap items-center justify-center gap-2.5 ${
            isUrgentBackup
              ? 'bg-amber-500/14 border-amber-500/35'
              : 'bg-sky-500/10 border-sky-500/20'
          }`}
        >
          <span className="text-zinc-100 tabular-nums-fa">
            {isUrgentBackup
              ? `مهم: ${formatFaNumber(unbackedEntriesCount)} وعده شما فقط روی حافظه مرورگر است و هنوز پشتیبان ندارد!`
              : `یادآوری پشتیبان‌گیری (${formatFaNumber(unbackedEntriesCount)} وعده جدید روی این دستگاه):`}
          </span>
          <button
            type="button"
            onClick={handleQuickDownloadBackup}
            className={`inline-flex items-center gap-1 rounded-lg font-bold px-2.5 py-1 text-[11px] ${
              isUrgentBackup
                ? 'bg-amber-500 text-[#1A1202]'
                : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300'
            }`}
          >
            <Download className="w-3 h-3" />
            <span>دانلود پشتیبان JSON</span>
          </button>
          <button
            type="button"
            onClick={() => setBackupReminderDismissed(true)}
            aria-label="یادآوری بعدی"
            className="text-zinc-400 hover:text-zinc-200 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-[#0C0C0D]/90 backdrop-blur-xl border-b border-[#1E1E22]">
        <div className="max-w-5xl mx-auto px-4 h-15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#161618] border border-[#26262A] flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-zinc-50 leading-tight truncate">
                  {APP_CONFIG.appName}
                </h1>
                {!pwaStatus.isOnline && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-300 px-1.5 py-0.5 text-[10px] font-medium shrink-0">
                    <WifiOff className="w-3 h-3" />
                    آفلاین
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight truncate mt-0.5">
                {selectedJalaliFull}
              </p>
            </div>
          </div>

          <nav
            aria-label="منوی اصلی دسکتاپ"
            className="hidden md:flex items-center gap-1 rounded-xl bg-[#161618] border border-[#26262A] p-1"
          >
            {NAV_ITEMS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  id={`desktop-nav-${tab.id}`}
                  data-nav-tab={tab.id}
                  aria-current={active ? 'page' : undefined}
                  onMouseEnter={() => preloadTab(tab.id)}
                  onFocus={() => preloadTab(tab.id)}
                  onClick={() => {
                    setOpenCalcOnSettings(false)
                    setActiveTab(tab.id)
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-emerald-500 text-[#051B11] font-bold'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#222227]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Compact Jalali Date Switcher + Monthly Calendar Trigger */}
          {activeTab === 'home' ? (
            <div className="flex items-center gap-1 rounded-xl bg-[#161618] border border-[#26262A] p-1 shrink-0">
              <button
                type="button"
                aria-label="روز قبل"
                onClick={() => setSelectedDateKey((k) => shiftDateKey(k, -1))}
                className="w-7 h-7 rounded-lg hover:bg-[#24242A] text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="open-jalali-calendar-btn"
                onClick={() => setCalendarOpen(true)}
                className="px-2 py-1 text-xs font-semibold text-zinc-200 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                title="انتخاب تاریخ از تقویم شمسی"
              >
                <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                <span>{selectedDayShortLabel}</span>
              </button>
              <button
                type="button"
                aria-label="روز بعد"
                disabled={isSelectedToday}
                onClick={() => setSelectedDateKey((k) => shiftDateKey(k, 1))}
                className="w-7 h-7 rounded-lg hover:bg-[#24242A] text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="md:hidden text-xs font-semibold text-zinc-300 bg-[#161618] border border-[#26262A] rounded-xl px-3 py-1.5">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
            </div>
          )}
        </div>
      </header>

      <JalaliCalendarPopover
        open={calendarOpen}
        selectedDateKey={selectedDateKey}
        todayKey={todayKey}
        loggedDateKeys={loggedDateKeys}
        onSelectDate={setSelectedDateKey}
        onClose={() => setCalendarOpen(false)}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 w-full max-w-5xl mx-auto px-4 pt-4 pb-28 md:pb-8">
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-8 space-y-4">
              <QuickEntryBar
                foods={foods}
                recentEntries={entries}
                templates={templates}
                totalLoggedCount={entries.length}
                goals={goals}
                onUpdateGoals={updateGoals}
                scheduleMode={goals.scheduleMode}
                inputText={quickInput}
                onInputTextChange={setQuickInput}
                mealType={mealType}
                onMealTypeChange={setMealType}
                onSubmitItems={handleSubmitQuickMeal}
                onApplyTemplate={handleApplyTemplate}
                onDeleteTemplate={deleteMealTemplate}
                onRequestAddCustomFood={handleRequestAddCustomFood}
                onRequestAddBarcodeFood={handleRequestAddBarcodeFood}
                onSaveFetchedBarcodeFood={addFood}
              />

              <OnboardingCard
                goals={goals}
                entriesCount={entries.length}
                pwaStatus={pwaStatus}
                onUpdateGoals={(next) => {
                  updateGoals(next)
                  showToast('هدف روزانه شما ذخیره شد')
                }}
                onTrySamplePhrase={(phrase) => setQuickInput(phrase)}
                onOpenCalculatorInSettings={() => {
                  setOpenCalcOnSettings(true)
                  setActiveTab('settings')
                }}
              />

              <div className="lg:hidden">
                <DailySummaryCard
                  idPrefix="mobile"
                  consumed={dailyConsumed}
                  goals={goals}
                  dayLabel={selectedDayShortLabel}
                  waterGlasses={selectedWaterGlasses}
                  dayEntries={dayEntries}
                  foods={foods}
                  onAdjustWater={(delta) => adjustWater(selectedDateKey, delta)}
                  onCopyDailyReport={handleCopyDailyReport}
                  onShareDailyImage={handleShareDailyImage}
                  onExploreRichFoods={(key) => {
                    setPrefillNutrientFilter(key)
                    setActiveTab('foods')
                  }}
                />
              </div>

              <TodayMealsList
                foods={foods}
                dayEntries={dayEntries}
                allEntries={entries}
                selectedDateKey={selectedDateKey}
                todayKey={todayKey}
                goals={goals}
                onDeleteEntry={handleDeleteEntry}
                onUpdateEntry={updateEntry}
                onRepeatEntries={handleRepeatEntries}
                onSaveTemplate={handleSaveTemplate}
              />
            </div>

            <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20">
              <DailySummaryCard
                idPrefix="desktop"
                consumed={dailyConsumed}
                goals={goals}
                dayLabel={selectedDayShortLabel}
                waterGlasses={selectedWaterGlasses}
                dayEntries={dayEntries}
                foods={foods}
                onAdjustWater={(delta) => adjustWater(selectedDateKey, delta)}
                onCopyDailyReport={handleCopyDailyReport}
                onShareDailyImage={handleShareDailyImage}
                onExploreRichFoods={(key) => {
                  setPrefillNutrientFilter(key)
                  setActiveTab('foods')
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <Suspense
            fallback={
              <div className="card-surface rounded-2xl p-8 text-center text-xs text-zinc-400">
                در حال بارگذاری نمودار روند و تاریخچه...
              </div>
            }
          >
            <WeeklyTrendsTab
              entries={entries}
              foods={foods}
              goals={goals}
              weights={weights}
              streakDays={streakDays}
              todayKey={todayKey}
              onSelectDate={handleSelectDateFromTrends}
              onUpsertWeight={(dk, w) => {
                upsertWeight(dk, w)
                showToast(`وزن ${formatFaNumber(w, 1)} کیلوگرم ثبت شد`)
              }}
              onDeleteWeight={deleteWeight}
              onExploreRichFoods={(key) => {
                setPrefillNutrientFilter(key)
                setActiveTab('foods')
              }}
            />
          </Suspense>
        )}

        {activeTab === 'foods' && (
          <Suspense
            fallback={
              <div className="card-surface rounded-2xl p-8 text-center text-xs text-zinc-400">
                در حال بارگذاری بانک غذاهای ایرانی...
              </div>
            }
          >
            <FoodDatabaseTab
              foods={foods}
              prefillNewFoodName={prefillNewFoodName}
              prefillNewFoodBarcode={prefillNewFoodBarcode}
              initialNutrientFilter={prefillNutrientFilter}
              onConsumePrefillName={() => {
                setPrefillNewFoodName(null)
                setPrefillNewFoodBarcode(null)
              }}
              onConsumeNutrientFilter={() => setPrefillNutrientFilter(null)}
              onAddFood={handleAddFood}
              onUpdateFood={handleUpdateFood}
              onDeleteFood={handleDeleteFood}
              onRevertFoodOverride={handleRevertFoodOverride}
              onQuickUseFood={handleQuickUseFood}
            />
          </Suspense>
        )}

        {activeTab === 'settings' && (
          <Suspense
            fallback={
              <div className="card-surface rounded-2xl p-8 text-center text-xs text-zinc-400">
                در حال بارگذاری تنظیمات...
              </div>
            }
          >
            <SettingsTab
              goals={goals}
              foods={foods}
              foodsCount={foods.length}
              customFoodsCount={customFoodsCount}
              overridesCount={overridesCount}
              entries={entries}
              theme={theme}
              lastBackupAt={lastBackupAt}
              preImportSavedAt={preImportSavedAt}
              persistenceState={persistenceState}
              pwaStatus={pwaStatus}
              initialOpenCalculator={openCalcOnSettings}
              onThemeChange={setTheme}
              onUpdateGoals={(next) => {
                updateGoals(next)
                showToast('اهداف روزانه به‌روزرسانی شد')
              }}
              onExportJson={exportBackupJson}
              onBuildBackupJson={buildBackupJson}
              onMarkBackedUp={markBackedUp}
              onExportCsv={exportEntriesCsv}
              onPreviewBackupJson={previewBackupJson}
              onImportJson={importBackupJson}
              onRestorePreImportSnapshot={restorePreImportSnapshot}
              onResetDefaultFoods={resetDefaultFoods}
              onClearAllEntries={() => {
                clearAllEntries()
                showToast('تاریخچه وعده‌ها پاک شد')
              }}
            />
          </Suspense>
        )}

        <footer className="mt-8 pt-4 border-t border-[#1E1E22] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
            <span>
              ارزش‌های غذایی برآورد تقریبی هستند · ابزار آموزشی (جایگزین پزشک نیست) · داده‌ها فقط روی
              دستگاه شما می‌ماند (بدون ردیابی).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="text-emerald-400 hover:underline font-medium shrink-0"
          >
            حریم خصوصی، بازخورد و مجوز MIT
          </button>
        </footer>
      </main>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="app-toast"
          className="fixed z-40 bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 max-w-[92vw] rounded-xl bg-[#1E1E22] border border-[#34343D] px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-100 shadow-2xl animate-fade-up flex items-center gap-3"
        >
          <span>{toast.message}</span>
          {toast.undoEntry && (
            <button
              type="button"
              id="toast-undo-btn"
              onClick={handleUndoDelete}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/18 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs px-2.5 py-1 shrink-0 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>بازگردانی</span>
            </button>
          )}
        </div>
      )}

      <nav
        aria-label="منوی اصلی موبایل"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#111113]/92 backdrop-blur-xl border-t border-[#26262A]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-4 h-16 max-w-lg mx-auto px-2">
          {NAV_ITEMS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                id={`mobile-nav-${tab.id}`}
                data-nav-tab={tab.id}
                aria-current={active ? 'page' : undefined}
                aria-pressed={active}
                onFocus={() => preloadTab(tab.id)}
                onClick={() => {
                  setOpenCalcOnSettings(false)
                  setActiveTab(tab.id)
                }}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
                  active ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div
                  className={`px-3 py-1 rounded-full transition-colors ${
                    active ? 'bg-emerald-500/14' : ''
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className={`text-[11px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default App
