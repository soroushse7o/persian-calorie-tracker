import { Check, Copy, Droplets, ImageDown, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  FoodItem,
  LoggedFoodEntry,
  MacroValues,
  MicronutrientKey,
  UserGoals,
} from '../types/nutrition'
import { computeMacroEnergySplit } from '../utils/micronutrients'
import { formatFaNumber } from '../utils/persianFormat'
import { MicronutrientPanel } from './MicronutrientPanel'
import { MacroDonutChart } from './charts/NativeCharts'

interface DailySummaryCardProps {
  idPrefix?: string
  consumed: MacroValues
  goals: UserGoals
  dayLabel: string
  waterGlasses: number
  dayEntries: readonly LoggedFoodEntry[]
  foods: readonly FoodItem[]
  onAdjustWater: (delta: number) => void
  onCopyDailyReport: () => Promise<boolean>
  onShareDailyImage?: () => Promise<void>
  onExploreRichFoods?: (nutrientKey: MicronutrientKey) => void
}

type SummaryViewMode = 'overview' | 'macro_chart' | 'micronutrients'

export function DailySummaryCard({
  idPrefix = 'summary',
  consumed,
  goals,
  dayLabel,
  waterGlasses,
  dayEntries,
  foods,
  onAdjustWater,
  onCopyDailyReport,
  onShareDailyImage,
  onExploreRichFoods,
}: DailySummaryCardProps) {
  const [viewMode, setViewMode] = useState<SummaryViewMode>('overview')
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<number | null>(null)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const viewModes: SummaryViewMode[] = ['overview', 'macro_chart', 'micronutrients']

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = viewModes.length - 1
    let next = index
    // RTL segmented control: ArrowLeft visually advances, ArrowRight goes back.
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = index + 1
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = index - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    else return
    e.preventDefault()
    const target = Math.min(last, Math.max(0, next))
    setViewMode(viewModes[target])
    tabRefs.current[target]?.focus()
  }

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  const macroSplit = useMemo(() => computeMacroEnergySplit(consumed, goals), [consumed, goals])
  const userProfile = useMemo(
    () => ({ sex: goals.sex, ageYears: goals.ageYears }),
    [goals.ageYears, goals.sex],
  )

  const ratio = goals.dailyKcal > 0 ? consumed.kcal / goals.dailyKcal : 0
  const clampedRatio = Math.min(1, Math.max(0, ratio))
  const remaining = goals.dailyKcal - consumed.kcal
  const isOver = remaining < 0

  const waterTarget = goals.waterGoalGlasses || 8
  const waterPct = Math.min(100, Math.round((waterGlasses / waterTarget) * 100))

  const size = 140
  const strokeWidth = 11
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clampedRatio)

  const macros = [
    {
      id: 'protein',
      label: 'پروتئین',
      consumed: consumed.protein,
      target: goals.proteinGrams,
      pctOfEnergy: macroSplit.proteinPct,
      barColor: 'bg-sky-400',
      textColor: 'text-sky-400',
      dotColor: 'bg-sky-400',
    },
    {
      id: 'carbs',
      label: 'کربوهیدرات',
      consumed: consumed.carbs,
      target: goals.carbsGrams,
      pctOfEnergy: macroSplit.carbsPct,
      barColor: 'bg-amber-400',
      textColor: 'text-amber-400',
      dotColor: 'bg-amber-400',
    },
    {
      id: 'fat',
      label: 'چربی',
      consumed: consumed.fat,
      target: goals.fatGrams,
      pctOfEnergy: macroSplit.fatPct,
      barColor: 'bg-rose-400',
      textColor: 'text-rose-400',
      dotColor: 'bg-rose-400',
    },
    {
      id: 'fiber',
      label: 'فیبر غذایی',
      consumed: consumed.fiber ?? 0,
      target: goals.fiberGrams ?? 28,
      pctOfEnergy: null,
      barColor: 'bg-lime-400',
      textColor: 'text-lime-400',
      dotColor: 'bg-lime-400',
    },
  ]

  const handleCopy = async () => {
    const ok = await onCopyDailyReport()
    if (ok) {
      setCopied(true)
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false)
        copyTimerRef.current = null
      }, 2000)
    }
  }

  return (
    <section
      aria-label={`خلاصه تغذیه ${dayLabel}`}
      className="card-surface rounded-2xl p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">خلاصه {dayLabel}</h2>
          <p className="text-[11px] text-zinc-400">انرژی، درشت‌مغذی‌ها و ۱۰ ریزمغزی کلیدی</p>
        </div>

        <div className="flex items-center gap-1.5">
          {onShareDailyImage && (
            <button
              type="button"
              id={`${idPrefix}-share-daily-image-btn`}
              onClick={() => void onShareDailyImage()}
              title="ذخیره یا اشتراک تصویر کارت روزانه"
              className="inline-flex items-center gap-1 rounded-lg bg-[#1E1E22] hover:bg-[#282830] border border-[#2C2C33] text-zinc-300 hover:text-zinc-100 text-[11px] font-medium px-2 py-1.5 transition-colors"
            >
              <ImageDown className="w-3 h-3 text-emerald-400" />
              <span>تصویر</span>
            </button>
          )}
          <button
            type="button"
            id={`${idPrefix}-copy-daily-report-btn`}
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1 rounded-lg bg-[#1E1E22] hover:bg-[#282830] border border-[#2C2C33] text-zinc-300 hover:text-zinc-100 text-[11px] font-medium px-2.5 py-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300">کپی شد</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>کپی متن</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3-Tab Segmented Mode Switcher */}
      <div
        role="tablist"
        aria-label="نمایش خلاصه، نمودار درشت‌مغذی‌ها یا ریزمغزی‌ها"
        className="grid grid-cols-3 rounded-xl bg-[#0C0C0D] p-1 border border-[#26262C] mb-4 text-[11px]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'overview'}
          aria-controls={`${idPrefix}-panel-overview`}
          tabIndex={viewMode === 'overview' ? 0 : -1}
          ref={(el) => { tabRefs.current[0] = el }}
          id={`${idPrefix}-tab-overview`}
          onKeyDown={(e) => handleTabKeyDown(e, 0)}
          onClick={() => setViewMode('overview')}
          className={`py-1.5 rounded-lg font-medium transition-colors ${
            viewMode === 'overview'
              ? 'bg-emerald-500 text-[#051B11] font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          خلاصه انرژی
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'macro_chart'}
          aria-controls={`${idPrefix}-panel-macro-chart`}
          tabIndex={viewMode === 'macro_chart' ? 0 : -1}
          ref={(el) => { tabRefs.current[1] = el }}
          id={`${idPrefix}-tab-macro-chart`}
          data-testid="summary-tab-macro-chart"
          onKeyDown={(e) => handleTabKeyDown(e, 1)}
          onClick={() => setViewMode('macro_chart')}
          className={`py-1.5 rounded-lg font-medium transition-colors ${
            viewMode === 'macro_chart'
              ? 'bg-emerald-500 text-[#051B11] font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          نمودار درشت‌مغذی
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'micronutrients'}
          aria-controls={`${idPrefix}-panel-micronutrients`}
          tabIndex={viewMode === 'micronutrients' ? 0 : -1}
          ref={(el) => { tabRefs.current[2] = el }}
          id={`${idPrefix}-tab-micronutrients`}
          data-testid="summary-tab-micronutrients"
          onKeyDown={(e) => handleTabKeyDown(e, 2)}
          onClick={() => setViewMode('micronutrients')}
          className={`py-1.5 rounded-lg font-medium transition-colors ${
            viewMode === 'micronutrients'
              ? 'bg-emerald-500 text-[#051B11] font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          ریزمغزی‌ها
        </button>
      </div>

      {/* Mode 1: Compact Side-by-Side Calorie Ring + 4 Macro/Fiber Bars (saves ~120px vertical space on mobile) */}
      <div
        role="tabpanel"
        id={`${idPrefix}-panel-overview`}
        aria-labelledby={`${idPrefix}-tab-overview`}
        tabIndex={0}
        hidden={viewMode !== 'overview'}
        style={{ display: viewMode === 'overview' ? undefined : 'none' }}
      >
      <div className="flex flex-row lg:flex-col items-center gap-4">
          <div className="relative flex items-center justify-center shrink-0">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="-rotate-90"
              role="img"
              aria-label={`مصرف تقریبی ${formatFaNumber(consumed.kcal)} از ${formatFaNumber(goals.dailyKcal)} کالری`}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--ring-track)"
                strokeWidth={strokeWidth}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={isOver ? '#F59E0B' : '#10B981'}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-500 ease-out"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
              <span
                data-testid="consumed-kcal"
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums-fa leading-none ${
                  isOver ? 'text-amber-300' : 'text-zinc-50'
                }`}
              >
                {formatFaNumber(consumed.kcal)}
              </span>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-1 tabular-nums-fa">
                از {formatFaNumber(goals.dailyKcal)} کالری
              </span>
              <span
                data-testid="remaining-kcal"
                className={`mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full tabular-nums-fa ${
                  isOver
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-emerald-500/12 text-emerald-300'
                }`}
              >
                {isOver
                  ? `${formatFaNumber(Math.abs(remaining))} بالاتر`
                  : `${formatFaNumber(remaining)} مانده`}
              </span>
            </div>
          </div>

          {/* Compact Macro + Fiber Progress Bars with Caloric Share Badge */}
          <div className="w-full min-w-0 space-y-2.5">
            {macros.map((m) => {
              const pct =
                m.target > 0 ? Math.min(100, Math.round((m.consumed / m.target) * 100)) : 0
              return (
                <div key={m.id} data-testid={`macro-bar-${m.id}`}>
                  <div className="flex items-center justify-between text-[11px] sm:text-xs mb-1 gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${m.dotColor}`} />
                      <span className="font-medium text-zinc-200 truncate">{m.label}</span>
                      {m.pctOfEnergy !== null && macroSplit.hasMacroEnergy && (
                        <span className="hidden sm:inline text-[10px] text-zinc-400 tabular-nums-fa">
                          ({formatFaNumber(m.pctOfEnergy)}٪)
                        </span>
                      )}
                    </div>
                    <div className="tabular-nums-fa text-zinc-400 shrink-0">
                      <span className={`font-semibold ${m.textColor}`}>
                        {formatFaNumber(m.consumed, 1)}
                      </span>
                      <span className="mx-0.5 text-zinc-600">/</span>
                      <span>{formatFaNumber(m.target)}گ</span>
                    </div>
                  </div>
                  <div
                    className="h-1.5 sm:h-2 rounded-full bg-[#242429] overflow-hidden"
                    role="meter"
                    aria-label={`پیشرفت ${m.label}`}
                    aria-valuemin={0}
                    aria-valuemax={m.target}
                    aria-valuenow={m.consumed}
                  >
                    <div
                      className={`h-full rounded-full ${m.barColor} transition-all duration-500 ease-out`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mode 2: Interactive Macronutrient Energy Donut Chart */}
      <div
        role="tabpanel"
        id={`${idPrefix}-panel-macro-chart`}
        aria-labelledby={`${idPrefix}-tab-macro-chart`}
        tabIndex={0}
        hidden={viewMode !== 'macro_chart'}
        style={{ display: viewMode === 'macro_chart' ? undefined : 'none' }}
      >
      <div className="space-y-2.5 animate-fade-up">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            سهم واقعی هر درشت‌مغذی از انرژی دریافتی (پروتئین و کربوهیدرات ۴ کالری/گرم، چربی ۹
            کالری/گرم) در مقایسه با هدف شما:
          </p>
          <MacroDonutChart
            split={macroSplit}
            proteinGrams={consumed.protein}
            carbsGrams={consumed.carbs}
            fatGrams={consumed.fat}
            fiberGrams={consumed.fiber ?? 0}
            fiberGoalGrams={goals.fiberGrams ?? 28}
            compact
          />
        </div>
      </div>

      {/* Mode 3: Interactive Daily Micronutrient Inspector (Radar + 10 Vitamins & Minerals) */}
      <div
        role="tabpanel"
        id={`${idPrefix}-panel-micronutrients`}
        aria-labelledby={`${idPrefix}-tab-micronutrients`}
        tabIndex={0}
        hidden={viewMode !== 'micronutrients'}
        style={{ display: viewMode === 'micronutrients' ? undefined : 'none' }}
      >
      <div className="animate-fade-up">
          <MicronutrientPanel
            entries={dayEntries}
            foods={foods}
            divisorDays={1}
            periodTitle={dayLabel}
            compact
            userProfile={userProfile}
            onExploreRichFoods={onExploreRichFoods}
          />
        </div>
      </div>

      {/* Compact Daily Water Intake Tracker */}
      <div className="mt-4 pt-4 border-t border-[#222227]" data-testid="water-tracker">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-zinc-200">آب روزانه</span>
            <span data-testid="water-count" className="text-cyan-400 font-semibold tabular-nums-fa">
              {formatFaNumber(waterGlasses)} / {formatFaNumber(waterTarget)} لیوان
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              id={`${idPrefix}-water-sub-btn`}
              data-testid="water-sub-btn"
              disabled={waterGlasses <= 0}
              onClick={() => onAdjustWater(-1)}
              aria-label="کاهش یک لیوان آب"
              className="w-7 h-7 rounded-lg bg-[#1E1E22] hover:bg-[#282830] disabled:opacity-35 text-zinc-300 flex items-center justify-center transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              id={`${idPrefix}-water-add-btn`}
              data-testid="water-add-btn"
              onClick={() => onAdjustWater(1)}
              aria-label="افزودن یک لیوان آب"
              className="inline-flex items-center gap-1 h-7 rounded-lg bg-cyan-500/14 hover:bg-cyan-500/24 text-cyan-300 text-[11px] font-semibold px-2.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>۱ لیوان</span>
            </button>
          </div>
        </div>
        <div
          className="h-1.5 rounded-full bg-[#242429] overflow-hidden"
          role="meter"
          aria-label="پیشرفت آب روزانه"
          aria-valuemin={0}
          aria-valuemax={waterTarget}
          aria-valuenow={waterGlasses}
        >
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-300 ease-out"
            style={{ width: `${waterPct}%` }}
          />
        </div>
      </div>
    </section>
  )
}
