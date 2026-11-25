import {
  BarChart3,
  Check,
  Copy,
  Flame,
  ImageDown,
  PieChart,
  Plus,
  Scale,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { APP_CONFIG } from '../config/env'
import {
  getMealTypeLabels,
  type FoodItem,
  type LoggedFoodEntry,
  type MicronutrientKey,
  type UserGoals,
  type WeightEntry,
} from '../types/nutrition'
import { buildPersianWeeklyReport } from '../utils/dailySummaryShare'
import { computeMacroEnergySplit } from '../utils/micronutrients'
import { toSpaceKey } from '../utils/persianFoodParser'
import {
  dateFromKey,
  formatFaNumber,
  formatJalaliDate,
  formatQuantityFa,
  getLastNDays,
  getLocalDateKey,
  toAsciiDigits,
} from '../utils/persianFormat'
import { exportWeeklySummaryImage } from '../utils/reportImageExport'
import { MicronutrientPanel } from './MicronutrientPanel'
import {
  CalorieBarChart,
  MacroDonutChart,
  MacroStackedBarChart,
  WeightLineChart,
  type CalorieBarPoint,
} from './charts/NativeCharts'

interface WeeklyTrendsTabProps {
  entries: LoggedFoodEntry[]
  foods: FoodItem[]
  goals: UserGoals
  weights: WeightEntry[]
  streakDays: number
  todayKey?: string
  onSelectDate: (dateKey: string) => void
  onUpsertWeight: (dateKey: string, weightKg: number) => void
  onDeleteWeight: (dateKey: string) => void
  onExploreRichFoods?: (nutrientKey: MicronutrientKey) => void
}

export function WeeklyTrendsTab({
  entries,
  foods,
  goals,
  weights,
  streakDays,
  todayKey = getLocalDateKey(),
  onSelectDate,
  onUpsertWeight,
  onDeleteWeight,
  onExploreRichFoods,
}: WeeklyTrendsTabProps) {
  const [rangeDays, setRangeDays] = useState<7 | 30>(7)
  const [weightInput, setWeightInput] = useState('')
  const [historyQuery, setHistoryQuery] = useState('')
  const [weeklyCopied, setWeeklyCopied] = useState(false)

  const mealLabels = getMealTypeLabels(goals.scheduleMode)
  const days = useMemo(() => getLastNDays(rangeDays, dateFromKey(todayKey)), [rangeDays, todayKey])
  const last7Days = useMemo(() => getLastNDays(7, dateFromKey(todayKey)), [todayKey])

  const rangeDateKeySet = useMemo(() => new Set(days.map((d) => d.dateKey)), [days])
  const rangeEntries = useMemo(
    () => entries.filter((e) => rangeDateKeySet.has(e.dateKey)),
    [entries, rangeDateKeySet],
  )

  const totalsByDay = useMemo(() => {
    const map = new Map<
      string,
      { kcal: number; protein: number; carbs: number; fat: number; fiber: number }
    >()
    for (const e of entries) {
      const curr = map.get(e.dateKey) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      curr.kcal += e.kcal
      curr.protein += e.protein
      curr.carbs += e.carbs
      curr.fat += e.fat
      curr.fiber += e.fiber ?? 0
      map.set(e.dateKey, curr)
    }
    return map
  }, [entries])

  const chartData = useMemo<CalorieBarPoint[]>(() => {
    return days.map((slot) => {
      const totals = totalsByDay.get(slot.dateKey) ?? {
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      }
      return {
        dateKey: slot.dateKey,
        axisLabel: rangeDays === 7 ? (slot.isToday ? 'امروز' : slot.weekdayCompact) : slot.jalaliShort,
        jalaliShort: slot.jalaliShort,
        jalaliFull: slot.jalaliFull,
        isToday: slot.isToday,
        kcal: Math.round(totals.kcal),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
        fiber: Math.round(totals.fiber * 10) / 10,
      }
    })
  }, [days, rangeDays, totalsByDay])

  const stats = useMemo(() => {
    const activeDays = chartData.filter((d) => d.kcal > 0)
    const divisor = activeDays.length > 0 ? activeDays.length : 1

    const totalKcal = chartData.reduce((s, d) => s + d.kcal, 0)
    const totalProtein = chartData.reduce((s, d) => s + d.protein, 0)
    const totalCarbs = chartData.reduce((s, d) => s + d.carbs, 0)
    const totalFat = chartData.reduce((s, d) => s + d.fat, 0)
    const totalFiber = chartData.reduce((s, d) => s + (d.fiber ?? 0), 0)

    const avgKcal = activeDays.length > 0 ? Math.round(totalKcal / divisor) : 0
    const avgProtein = activeDays.length > 0 ? Math.round((totalProtein / divisor) * 10) / 10 : 0
    const avgCarbs = activeDays.length > 0 ? Math.round((totalCarbs / divisor) * 10) / 10 : 0
    const avgFat = activeDays.length > 0 ? Math.round((totalFat / divisor) * 10) / 10 : 0
    const avgFiber = activeDays.length > 0 ? Math.round((totalFiber / divisor) * 10) / 10 : 0

    const withinGoalDays = activeDays.filter((d) => d.kcal <= goals.dailyKcal).length

    const macroSplit = computeMacroEnergySplit(
      {
        kcal: avgKcal,
        protein: avgProtein,
        carbs: avgCarbs,
        fat: avgFat,
        fiber: avgFiber,
      },
      goals,
    )

    const maxBarKcal = Math.max(
      goals.dailyKcal * 1.15,
      ...chartData.map((d) => d.kcal * 1.12),
      1000,
    )

    return {
      activeDaysCount: activeDays.length,
      totalKcal,
      avgKcal,
      avgProtein,
      avgCarbs,
      avgFat,
      avgFiber,
      withinGoalDays,
      macroSplit,
      maxAxisKcal: Math.ceil(maxBarKcal / 250) * 250,
    }
  }, [chartData, goals])

  const weeklyReportData = useMemo(() => {
    const sevenPts = last7Days.map((slot) => {
      const t = totalsByDay.get(slot.dateKey) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      return {
        label: slot.isToday ? 'امروز' : slot.weekdayCompact,
        jalaliShort: slot.jalaliShort,
        kcal: Math.round(t.kcal),
        protein: t.protein,
        carbs: t.carbs,
        fat: t.fat,
      }
    })
    const active = sevenPts.filter((d) => d.kcal > 0)
    const div = active.length || 1
    const periodLabel = `${sevenPts[0]?.jalaliShort ?? ''} تا ${sevenPts[sevenPts.length - 1]?.jalaliShort ?? ''}`
    return {
      periodLabel,
      activeDaysCount: active.length,
      avgKcal: active.length > 0 ? Math.round(sevenPts.reduce((s, d) => s + d.kcal, 0) / div) : 0,
      withinGoalDays: active.filter((d) => d.kcal <= goals.dailyKcal).length,
      avgProtein:
        active.length > 0
          ? Math.round((sevenPts.reduce((s, d) => s + d.protein, 0) / div) * 10) / 10
          : 0,
      avgCarbs:
        active.length > 0
          ? Math.round((sevenPts.reduce((s, d) => s + d.carbs, 0) / div) * 10) / 10
          : 0,
      avgFat:
        active.length > 0
          ? Math.round((sevenPts.reduce((s, d) => s + d.fat, 0) / div) * 10) / 10
          : 0,
      days: sevenPts.map((d) => ({ label: d.label, kcal: d.kcal })),
    }
  }, [goals.dailyKcal, last7Days, totalsByDay])

  const handleCopyWeeklyReport = async () => {
    const text = buildPersianWeeklyReport({
      appName: APP_CONFIG.appName,
      goalKcal: goals.dailyKcal,
      ...weeklyReportData,
    })
    try {
      await navigator.clipboard.writeText(text)
      setWeeklyCopied(true)
      window.setTimeout(() => setWeeklyCopied(false), 2000)
    } catch {
      // Ignore clipboard restriction
    }
  }

  const handleExportWeeklyImage = async () => {
    await exportWeeklySummaryImage(
      {
        appName: APP_CONFIG.appName,
        goalKcal: goals.dailyKcal,
        periodLabel: weeklyReportData.periodLabel,
        avgKcal: weeklyReportData.avgKcal,
        activeDaysCount: weeklyReportData.activeDaysCount,
        avgProtein: weeklyReportData.avgProtein,
        avgCarbs: weeklyReportData.avgCarbs,
        avgFat: weeklyReportData.avgFat,
        days: weeklyReportData.days,
      },
      `kalorishomar-weekly-${todayKey}.png`,
    )
  }

  const historyResults = useMemo(() => {
    const q = toSpaceKey(historyQuery)
    if (!q) return []
    return entries
      .filter((e) => {
        const mealLabel = mealLabels[e.mealType]
        const jalali = formatJalaliDate(dateFromKey(e.dateKey), 'medium')
        const haystack = toSpaceKey(
          `${e.foodName} ${e.unit} ${mealLabel} ${jalali} ${e.sourceText ?? ''}`,
        )
        return haystack.includes(q)
      })
      .slice(0, 30)
  }, [entries, historyQuery, mealLabels])

  const weightChartPoints = useMemo(() => {
    return weights.slice(-30).map((w) => {
      const d = dateFromKey(w.dateKey)
      return {
        dateKey: w.dateKey,
        weightKg: w.weightKg,
        jalaliShort: formatJalaliDate(d, 'short'),
        jalaliFull: formatJalaliDate(d, 'full'),
      }
    })
  }, [weights])

  const latestWeight = weightChartPoints[weightChartPoints.length - 1] ?? null
  const weightDelta =
    weightChartPoints.length >= 2
      ? Math.round(
          (weightChartPoints[weightChartPoints.length - 1].weightKg -
            weightChartPoints[0].weightKg) *
            10,
        ) / 10
      : null

  const handleSubmitWeight = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = Number(toAsciiDigits(weightInput).replace(/٫/g, '.').trim())
    if (!Number.isFinite(parsed) || parsed < 25 || parsed > 300) return
    onUpsertWeight(todayKey, parsed)
    setWeightInput('')
  }

  return (
    <div className="space-y-4 animate-fade-up" data-testid="weekly-trends-tab">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="card-surface rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-400">
            <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>میانگین روزانه</span>
          </div>
          <div
            data-testid="weekly-avg-kcal"
            className="text-lg sm:text-2xl font-extrabold text-zinc-50 mt-1.5 tabular-nums-fa"
          >
            {formatFaNumber(stats.avgKcal)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums-fa">
            کالری ({formatFaNumber(stats.activeDaysCount)} روز دارای ثبت)
          </div>
        </div>

        <div className="card-surface rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-400">
            <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>هدف انتخابی</span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-zinc-50 mt-1.5 tabular-nums-fa">
            {formatFaNumber(goals.dailyKcal)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums-fa">
            {formatFaNumber(stats.withinGoalDays)} روز در محدوده هدف
          </div>
        </div>

        <div className="card-surface rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-400">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>همراهی اخیر</span>
          </div>
          <div
            data-testid="weekly-streak-days"
            className="text-lg sm:text-2xl font-extrabold text-zinc-50 mt-1.5 tabular-nums-fa"
          >
            {formatFaNumber(streakDays)} روز
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
            {streakDays === 0 ? 'وقفه طبیعی است؛ هر زمان آماده بودید' : 'پیوسته تا امروز یا دیروز'}
          </div>
        </div>
      </div>

      {/* Native Zero-Dependency SVG Calorie Bar Chart */}
      <section
        className="card-surface rounded-2xl p-4 sm:p-5"
        aria-label="نمودار کالری هفتگی و ماهانه"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                روند کالری {rangeDays === 7 ? '۷ روز اخیر' : '۳۰ روز اخیر (ماهانه)'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                برای مشاهده یا ویرایش وعده‌ها روی ستون یا تاریخ هر روز بزنید
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="share-weekly-image-btn"
              onClick={() => void handleExportWeeklyImage()}
              className="inline-flex items-center gap-1 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2C2C33] px-2.5 py-1.5 text-[11px] text-zinc-200 transition-colors"
              title="خروجی تصویر کارت گزارش هفتگی (PNG)"
            >
              <ImageDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>تصویر هفتگی</span>
            </button>
            <button
              type="button"
              id="copy-weekly-report-btn"
              onClick={() => void handleCopyWeeklyReport()}
              className="inline-flex items-center gap-1 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2C2C33] px-2.5 py-1.5 text-[11px] text-zinc-200 transition-colors"
            >
              {weeklyCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>گزارش متنی</span>
                </>
              )}
            </button>

            <div className="inline-flex rounded-xl bg-[#0C0C0D] p-1 border border-[#26262A]">
              <button
                type="button"
                id="range-7d-btn"
                onClick={() => setRangeDays(7)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  rangeDays === 7
                    ? 'bg-emerald-500 text-[#051B11] font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ۷ روزه
              </button>
              <button
                type="button"
                id="range-30d-btn"
                onClick={() => setRangeDays(30)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  rangeDays === 30
                    ? 'bg-emerald-500 text-[#051B11] font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ۳۰ روزه
              </button>
            </div>
          </div>
        </div>

        <CalorieBarChart
          data={chartData}
          goalKcal={goals.dailyKcal}
          maxAxisKcal={stats.maxAxisKcal}
          rangeDays={rangeDays}
          onSelectDate={onSelectDate}
        />

        {rangeDays === 7 ? (
          <div
            dir="ltr"
            className="mt-3 pt-3 border-t border-[#222227] grid grid-cols-7 gap-1 text-center pl-10 pr-2"
          >
            {chartData.map((d) => (
              <button
                key={d.dateKey}
                type="button"
                dir="rtl"
                onClick={() => onSelectDate(d.dateKey)}
                title={`مشاهده گزارش ${d.jalaliFull}`}
                className="rounded-lg py-1 px-0.5 hover:bg-[#1E1E24] transition-colors text-[10px] sm:text-[11px] tabular-nums-fa"
              >
                <div className={d.isToday ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                  {d.jalaliShort}
                </div>
                <div className="text-zinc-200 font-medium mt-0.5">
                  {d.kcal > 0 ? formatFaNumber(d.kcal) : '—'}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-[#222227] flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {chartData
              .filter((d) => d.kcal > 0 || d.isToday)
              .reverse()
              .slice(0, 12)
              .map((d) => (
                <button
                  key={d.dateKey}
                  type="button"
                  onClick={() => onSelectDate(d.dateKey)}
                  className="shrink-0 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2C2C33] px-2.5 py-1.5 text-[11px] tabular-nums-fa"
                >
                  <span className={d.isToday ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                    {d.jalaliShort}:
                  </span>{' '}
                  <span className="text-zinc-100 font-semibold">{formatFaNumber(d.kcal)}</span>
                </button>
              ))}
          </div>
        )}
      </section>

      {/* Complete Macronutrient Charts (Donut Energy Split + Daily Stacked Bar) */}
      <section
        className="card-surface rounded-2xl p-4 sm:p-5 space-y-5"
        aria-label="نمودار جامع درشت‌مغذی‌ها"
        data-testid="trends-macro-section"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/12 flex items-center justify-center text-amber-400">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              نمودار کامل درشت‌مغذی‌ها ({rangeDays === 7 ? '۷ روز اخیر' : '۳۰ روز اخیر'})
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              سهم انرژی میانگین روزانه (حلقه‌ای) و روند تفکیکی هر روز (انباشته: پروتئین، کربوهیدرات،
              چربی)
            </p>
          </div>
        </div>

        {!stats.macroSplit.hasMacroEnergy ? (
          <p className="text-xs text-zinc-400 py-4 text-center">
            با ثبت اولین وعده، نمودار حلقه‌ای سهم انرژی و نمودار ستونی انباشته درشت‌مغذی‌ها فعال
            می‌شود.
          </p>
        ) : (
          <div className="space-y-5">
            <MacroDonutChart
              split={stats.macroSplit}
              proteinGrams={stats.avgProtein}
              carbsGrams={stats.avgCarbs}
              fatGrams={stats.avgFat}
              fiberGrams={stats.avgFiber}
              fiberGoalGrams={goals.fiberGrams ?? 28}
            />

            <div className="pt-3 border-t border-[#23232A] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-zinc-200">
                  روند روزانه انرژی درشت‌مغذی‌ها (کالری تفکیکی هر روز)
                </span>
                <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400" /> پروتئین
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> کربوهیدرات
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400" /> چربی
                  </span>
                </div>
              </div>

              <MacroStackedBarChart
                data={chartData}
                rangeDays={rangeDays}
                onSelectDate={onSelectDate}
              />
            </div>
          </div>
        )}
      </section>

      {/* Complete Micronutrient Inspector (Radar + 10 Vitamins & Minerals Average) */}
      <section
        className="card-surface rounded-2xl p-4 sm:p-5 space-y-4"
        aria-label="بررسی ریزمغزی‌ها (ویتامین‌ها و املاح معدنی)"
        data-testid="trends-micronutrients-section"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              بررسی ریزمغزی‌ها — میانگین روزانه ({rangeDays === 7 ? '۷ روزه' : '۳۰ روزه'})
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              میانگین ویتامین‌ها، املاح معدنی و سقف سدیم در روزهای دارای ثبت
            </p>
          </div>
        </div>

        <MicronutrientPanel
          entries={rangeEntries}
          foods={foods}
          divisorDays={Math.max(1, stats.activeDaysCount)}
          periodTitle={`میانگین روزانه در ${formatFaNumber(stats.activeDaysCount)} روز فعال`}
          userProfile={{ sex: goals.sex, ageYears: goals.ageYears }}
          onExploreRichFoods={onExploreRichFoods}
        />
      </section>

      {/* Search Across Meal History */}
      <section
        className="card-surface rounded-2xl p-4 sm:p-5 space-y-3"
        aria-label="جستجو در تاریخچه وعده‌ها"
        data-testid="history-search-section"
      >
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">جستجو در تاریخچه وعده‌ها</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            جستجو بر اساس نام غذا، نوع وعده یا تاریخ شمسی
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            id="history-search-input"
            value={historyQuery}
            onChange={(e) => setHistoryQuery(e.target.value)}
            placeholder="مثلاً: قورمه‌سبزی، سنگک، ناهار، سحری، آبان..."
            className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none pr-10 pl-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500"
          />
        </div>

        {historyQuery.trim() !== '' && (
          <div className="space-y-2">
            {historyResults.length === 0 ? (
              <p className="text-xs text-zinc-400 py-2 text-center">
                وعده‌ای مطابق با «{historyQuery.trim()}» در تاریخچه یافت نشد.
              </p>
            ) : (
              <>
                <div className="text-[11px] text-zinc-400 tabular-nums-fa">
                  {formatFaNumber(historyResults.length)} مورد یافت شد (مجموع ~
                  {formatFaNumber(historyResults.reduce((s, e) => s + e.kcal, 0))} کالری):
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                  {historyResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      data-testid="history-search-result-row"
                      onClick={() => onSelectDate(item.dateKey)}
                      className="w-full rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2B2B33] px-3 py-2 flex items-center justify-between gap-2 text-right text-xs transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-zinc-100">{item.foodName}</span>
                        <span className="text-zinc-400 mr-2 tabular-nums-fa">
                          {formatQuantityFa(item.quantity)} {item.unit} ·{' '}
                          {mealLabels[item.mealType]}
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center gap-2 tabular-nums-fa text-[11px]">
                        <span className="text-emerald-400 font-semibold">
                          ~{formatFaNumber(item.kcal)} ک
                        </span>
                        <span className="text-zinc-400">
                          {formatJalaliDate(dateFromKey(item.dateKey), 'short')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* Weight Tracking & Native SVG Progress Chart (with 7-Day Moving Average & Target Weight) */}
      <section
        className="card-surface rounded-2xl p-4 sm:p-5 space-y-4"
        aria-label="ثبت وزن و نمودار روند"
        data-testid="weight-tracker-section"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/12 flex items-center justify-center text-sky-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">ثبت اختیاری وزن و میانگین متحرک</h2>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {latestWeight
                  ? `آخرین ثبت: ${formatFaNumber(latestWeight.weightKg, 1)} کیلوگرم${
                      weightDelta !== null
                        ? ` (تغییر نسبت به ابتدای دوره: ${weightDelta > 0 ? '+' : ''}${formatFaNumber(weightDelta, 1)} ک‌گ)`
                        : ''
                    } — منحنی سبز نوسان روزانه آب بدن را هموار می‌کند`
                  : 'نوسان روزانه وزن طبیعی است؛ در صورت تمایل روند چند هفته‌ای را دنبال کنید'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitWeight} className="flex items-center gap-2">
            <label htmlFor="weight-log-input" className="sr-only">
              وزن امروز به کیلوگرم
            </label>
            <input
              id="weight-log-input"
              type="text"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="وزن (مثلاً ۷۴٫۵)"
              className="w-32 rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-sky-400/70 focus:outline-none px-3 py-2 text-xs text-zinc-100 tabular-nums-fa"
            />
            <button
              type="submit"
              id="save-weight-btn"
              className="inline-flex items-center gap-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-[#041824] font-bold text-xs px-3 py-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت وزن</span>
            </button>
          </form>
        </div>

        {weightChartPoints.length >= 2 && (
          <WeightLineChart points={weightChartPoints} targetWeightKg={goals.targetWeightKg} />
        )}

        {weightChartPoints.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {weightChartPoints
              .slice()
              .reverse()
              .slice(0, 6)
              .map((w) => (
                <div
                  key={w.dateKey}
                  data-testid="weight-entry-pill"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1E1E22] border border-[#2B2B32] px-2.5 py-1.5 text-xs tabular-nums-fa"
                >
                  <span className="text-zinc-400">{w.jalaliShort}:</span>
                  <span className="font-bold text-sky-400">{formatFaNumber(w.weightKg, 1)} ک‌گ</span>
                  <button
                    type="button"
                    aria-label={`حذف وزن ${w.jalaliShort}`}
                    onClick={() => onDeleteWeight(w.dateKey)}
                    className="text-zinc-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  )
}
