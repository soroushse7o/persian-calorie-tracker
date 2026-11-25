import { AlertTriangle, Calculator, Check, ChevronDown, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { MealScheduleMode, UserGoals } from '../../types/nutrition'
import {
  ACTIVITY_LEVEL_LABELS,
  HEALTH_DISCLAIMERS,
  MIN_CALCULATOR_AGE,
  WEIGHT_GOAL_LABELS,
  evaluateTdeeGoals,
  type ActivityLevel,
  type BiologicalSex,
  type WeightGoal,
} from '../../utils/calorieCalculator'
import { formatFaNumber, toAsciiDigits } from '../../utils/persianFormat'

const LOW_CALORIE_WARNING_THRESHOLD = 1200

const GOAL_PRESETS: Array<{ label: string; sub: string; goals: UserGoals }> = [
  {
    label: 'کاهش ملایم',
    sub: '۱٬۶۰۰ کالری',
    goals: {
      dailyKcal: 1600,
      proteinGrams: 115,
      carbsGrams: 160,
      fatGrams: 55,
      fiberGrams: 24,
      waterGoalGlasses: 8,
    },
  },
  {
    label: 'تثبیت وزن',
    sub: '۲٬۰۰۰ کالری',
    goals: {
      dailyKcal: 2000,
      proteinGrams: 120,
      carbsGrams: 230,
      fatGrams: 65,
      fiberGrams: 28,
      waterGoalGlasses: 8,
    },
  },
  {
    label: 'افزایش حجم',
    sub: '۲٬۵۰۰ کالری',
    goals: {
      dailyKcal: 2500,
      proteinGrams: 155,
      carbsGrams: 300,
      fatGrams: 75,
      fiberGrams: 35,
      waterGoalGlasses: 10,
    },
  },
]

function parseIntInput(val: string, fallback: number): number {
  const num = Number(toAsciiDigits(val).trim())
  return Number.isFinite(num) && num > 0 ? Math.round(num) : fallback
}

function parseOptionalWeight(val: string): number | undefined {
  const cleaned = toAsciiDigits(val).replace(/٫/g, '.').trim()
  if (!cleaned) return undefined
  const num = Number(cleaned)
  return Number.isFinite(num) && num >= 30 && num <= 250
    ? Math.round(num * 10) / 10
    : undefined
}

function parseRawAge(val: string): number {
  const cleaned = toAsciiDigits(val).trim()
  if (!cleaned) return 0
  const num = Number(cleaned)
  return Number.isFinite(num) ? Math.round(num) : 0
}

interface GoalsAndCalculatorSectionProps {
  goals: UserGoals
  initialOpenCalculator?: boolean
  onUpdateGoals: (goals: UserGoals) => void
}

export function GoalsAndCalculatorSection({
  goals,
  initialOpenCalculator = false,
  onUpdateGoals,
}: GoalsAndCalculatorSectionProps) {
  const [prevGoals, setPrevGoals] = useState(goals)
  const [kcalInput, setKcalInput] = useState(String(goals.dailyKcal))
  const [proteinInput, setProteinInput] = useState(String(goals.proteinGrams))
  const [carbsInput, setCarbsInput] = useState(String(goals.carbsGrams))
  const [fatInput, setFatInput] = useState(String(goals.fatGrams))
  const [fiberInput, setFiberInput] = useState(String(goals.fiberGrams ?? 28))
  const [waterInput, setWaterInput] = useState(String(goals.waterGoalGlasses))
  const [targetWeightInput, setTargetWeightInput] = useState(
    goals.targetWeightKg !== undefined ? String(goals.targetWeightKg) : '',
  )
  const [profileSex, setProfileSex] = useState<'none' | 'male' | 'female'>(goals.sex ?? 'none')
  const [savedNotice, setSavedNotice] = useState(false)
  const [lowKcalAcknowledged, setLowKcalAcknowledged] = useState(false)

  if (
    prevGoals.dailyKcal !== goals.dailyKcal ||
    prevGoals.proteinGrams !== goals.proteinGrams ||
    prevGoals.carbsGrams !== goals.carbsGrams ||
    prevGoals.fatGrams !== goals.fatGrams ||
    prevGoals.fiberGrams !== goals.fiberGrams ||
    prevGoals.waterGoalGlasses !== goals.waterGoalGlasses ||
    prevGoals.scheduleMode !== goals.scheduleMode ||
    prevGoals.sex !== goals.sex ||
    prevGoals.targetWeightKg !== goals.targetWeightKg
  ) {
    setPrevGoals(goals)
    setKcalInput(String(goals.dailyKcal))
    setProteinInput(String(goals.proteinGrams))
    setCarbsInput(String(goals.carbsGrams))
    setFatInput(String(goals.fatGrams))
    setFiberInput(String(goals.fiberGrams ?? 28))
    setWaterInput(String(goals.waterGoalGlasses))
    setTargetWeightInput(goals.targetWeightKg !== undefined ? String(goals.targetWeightKg) : '')
    setProfileSex(goals.sex ?? 'none')
  }

  const [calcOpen, setCalcOpen] = useState(initialOpenCalculator)
  const [sex, setSex] = useState<BiologicalSex>(goals.sex ?? 'male')
  const [age, setAge] = useState(String(goals.ageYears ?? 30))
  const [height, setHeight] = useState('175')
  const [weight, setWeight] = useState('75')
  const [activity, setActivity] = useState<ActivityLevel>('light')
  const [weightGoal, setWeightGoal] = useState<WeightGoal>('lose')

  const parsedDraftKcal = parseIntInput(kcalInput, goals.dailyKcal)
  const isDraftBelowSafeFloor =
    parsedDraftKcal >= 800 && parsedDraftKcal < LOW_CALORIE_WARNING_THRESHOLD

  const tdeeEvaluation = useMemo(() => {
    return evaluateTdeeGoals({
      sex,
      ageYears: parseRawAge(age),
      heightCm: parseIntInput(height, 175),
      weightKg: parseIntInput(weight, 75),
      activity,
      goal: weightGoal,
    })
  }, [sex, age, height, weight, activity, weightGoal])

  const syncInputsAndSave = (next: UserGoals) => {
    const merged: UserGoals = {
      ...next,
      fiberGrams: next.fiberGrams ?? goals.fiberGrams ?? 28,
      scheduleMode: next.scheduleMode ?? goals.scheduleMode ?? 'standard',
      ...(next.sex ? { sex: next.sex } : goals.sex ? { sex: goals.sex } : {}),
      ...(next.ageYears
        ? { ageYears: next.ageYears }
        : goals.ageYears
          ? { ageYears: goals.ageYears }
          : {}),
      ...(next.targetWeightKg !== undefined
        ? { targetWeightKg: next.targetWeightKg }
        : goals.targetWeightKg !== undefined
          ? { targetWeightKg: goals.targetWeightKg }
          : {}),
    }
    setKcalInput(String(merged.dailyKcal))
    setProteinInput(String(merged.proteinGrams))
    setCarbsInput(String(merged.carbsGrams))
    setFatInput(String(merged.fatGrams))
    setFiberInput(String(merged.fiberGrams ?? 28))
    setWaterInput(String(merged.waterGoalGlasses))
    setProfileSex(merged.sex ?? 'none')
    setLowKcalAcknowledged(false)
    onUpdateGoals(merged)
    setSavedNotice(true)
    window.setTimeout(() => setSavedNotice(false), 2400)
  }

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault()
    const nextKcal = parseIntInput(kcalInput, goals.dailyKcal)
    if (nextKcal >= 800 && nextKcal < LOW_CALORIE_WARNING_THRESHOLD && !lowKcalAcknowledged) {
      setLowKcalAcknowledged(true)
      return
    }
    const parsedTargetWeight = parseOptionalWeight(targetWeightInput)
    const nextPayload: UserGoals = {
      dailyKcal: nextKcal,
      proteinGrams: parseIntInput(proteinInput, goals.proteinGrams),
      carbsGrams: parseIntInput(carbsInput, goals.carbsGrams),
      fatGrams: parseIntInput(fatInput, goals.fatGrams),
      fiberGrams: parseIntInput(fiberInput, goals.fiberGrams ?? 28),
      waterGoalGlasses: parseIntInput(waterInput, goals.waterGoalGlasses),
      scheduleMode: goals.scheduleMode ?? 'standard',
      ...(profileSex !== 'none' ? { sex: profileSex } : {}),
      ...(goals.ageYears ? { ageYears: goals.ageYears } : {}),
      ...(parsedTargetWeight !== undefined ? { targetWeightKg: parsedTargetWeight } : {}),
    }
    setLowKcalAcknowledged(false)
    onUpdateGoals(nextPayload)
    setSavedNotice(true)
    window.setTimeout(() => setSavedNotice(false), 2400)
  }

  const handleChangeScheduleMode = (mode: MealScheduleMode) => {
    onUpdateGoals({ ...goals, scheduleMode: mode })
  }

  const scheduleMode = goals.scheduleMode ?? 'standard'

  return (
    <div className="space-y-4">
      {/* Smart Persian TDEE Goal Calculator (Strictly 18+) */}
      <section className="card-surface rounded-2xl overflow-hidden">
        <button
          type="button"
          id="toggle-tdee-calculator-btn"
          onClick={() => setCalcOpen((o) => !o)}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-right hover:bg-[#1B1B1F] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/12 flex items-center justify-center text-amber-400 shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-zinc-100">
                  محاسبه‌گر هوشمند کالری، درشت‌مغذی و مرجع ریزمغزی (TDEE)
                </h2>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300">
                  بزرگسالان +۱۸
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                برآورد تقریبی نیاز انرژی، فیبر و کالیبره‌سازی نیاز آهن و املاح بر اساس سن و جنسیت
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
              calcOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {calcOpen && (
          <div
            data-testid="tdee-calculator-panel"
            className="px-4 sm:px-5 pb-5 pt-3 border-t border-[#222227] space-y-4 animate-fade-up"
          >
            <div
              data-testid="health-disclaimer-banner"
              className="rounded-xl bg-amber-500/8 border border-amber-500/25 p-3 text-xs space-y-1.5 leading-relaxed"
            >
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>سلب مسئولیت سلامت و محدودیت سنی (+۱۸)</span>
              </div>
              <p className="text-zinc-300">{HEALTH_DISCLAIMERS.educationalNotice}</p>
              <p className="text-zinc-400">{HEALTH_DISCLAIMERS.specialGroupsWarning}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <span className="block text-[11px] text-zinc-400 mb-1.5">جنسیت فیزیولوژیک</span>
                <div className="grid grid-cols-2 rounded-xl bg-[#0C0C0D] p-1 border border-[#2C2C33]">
                  <button
                    type="button"
                    onClick={() => setSex('male')}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sex === 'male'
                        ? 'bg-emerald-500 text-[#051B11] font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    مرد
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('female')}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sex === 'female'
                        ? 'bg-emerald-500 text-[#051B11] font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    زن
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="tdee-age-input" className="block text-[11px] text-zinc-400 mb-1.5">
                  سن (حداقل {formatFaNumber(MIN_CALCULATOR_AGE)} سال)
                </label>
                <input
                  id="tdee-age-input"
                  type="text"
                  inputMode="numeric"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-sm text-zinc-100 tabular-nums-fa"
                />
              </div>

              <div>
                <label
                  htmlFor="tdee-height-input"
                  className="block text-[11px] text-zinc-400 mb-1.5"
                >
                  قد (سانتی‌متر)
                </label>
                <input
                  id="tdee-height-input"
                  type="text"
                  inputMode="numeric"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-sm text-zinc-100 tabular-nums-fa"
                />
              </div>

              <div>
                <label
                  htmlFor="tdee-weight-input"
                  className="block text-[11px] text-zinc-400 mb-1.5"
                >
                  وزن (کیلوگرم)
                </label>
                <input
                  id="tdee-weight-input"
                  type="text"
                  inputMode="numeric"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-sm text-zinc-100 tabular-nums-fa"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="tdee-activity-select"
                  className="block text-[11px] text-zinc-400 mb-1.5"
                >
                  میزان فعالیت هفتگی
                </label>
                <select
                  id="tdee-activity-select"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value as ActivityLevel)}
                  className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2.5 text-xs sm:text-sm text-zinc-100"
                >
                  {(Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]).map((level) => (
                    <option key={level} value={level}>
                      {ACTIVITY_LEVEL_LABELS[level].title} — {ACTIVITY_LEVEL_LABELS[level].hint}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-[11px] text-zinc-400 mb-1.5">هدف تغذیه‌ای</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(WEIGHT_GOAL_LABELS) as WeightGoal[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setWeightGoal(g)}
                      className={`rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${
                        weightGoal === g
                          ? 'bg-emerald-500/14 border-emerald-500/45 text-emerald-300 font-semibold'
                          : 'bg-[#1E1E22] border-[#2A2A31] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {g === 'lose' ? 'کاهش ملایم' : g === 'maintain' ? 'تثبیت' : 'افزایش'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!tdeeEvaluation.ok ? (
              <div
                data-testid="tdee-underage-block"
                className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3.5 text-xs text-rose-300 leading-relaxed"
              >
                {tdeeEvaluation.error}
              </div>
            ) : (
              <div className="card-elevated rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 tabular-nums-fa">
                  <div className="text-xs text-zinc-400">
                    برآورد تقریبی برای شما (BMR: {formatFaNumber(tdeeEvaluation.result.bmr)} · TDEE:{' '}
                    {formatFaNumber(tdeeEvaluation.result.tdee)}):
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span
                      data-testid="tdee-recommended-kcal"
                      className="text-base font-extrabold text-emerald-400"
                    >
                      {formatFaNumber(tdeeEvaluation.result.recommendedGoals.dailyKcal)} کالری
                    </span>
                    <span className="text-sky-400">
                      پروتئین {formatFaNumber(tdeeEvaluation.result.recommendedGoals.proteinGrams)}گ
                    </span>
                    <span className="text-amber-400">
                      کربوهیدرات {formatFaNumber(tdeeEvaluation.result.recommendedGoals.carbsGrams)}گ
                    </span>
                    <span className="text-rose-400">
                      چربی {formatFaNumber(tdeeEvaluation.result.recommendedGoals.fatGrams)}گ
                    </span>
                    <span className="text-lime-400">
                      فیبر {formatFaNumber(tdeeEvaluation.result.recommendedGoals.fiberGrams ?? 28)}گ
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="apply-tdee-goals-btn"
                  onClick={() => {
                    syncInputsAndSave(tdeeEvaluation.result.recommendedGoals)
                    setCalcOpen(false)
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-xs px-4 py-2.5 transition-colors"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>اعمال به اهداف و شخصی‌سازی ریزمغزی‌ها</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Daily Goals + 3 Schedule Modes (Standard / Ramadan / Intermittent Fasting 16:8) */}
      <section className="card-surface rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">اهداف روزانه و الگوی وعده‌ها</h2>
              <p className="text-[11px] text-zinc-400">
                تنظیم کالری، درشت‌مغذی‌ها، فیبر، وزن هدف و الگوی وعده‌ها
              </p>
            </div>
          </div>

          <div
            data-testid="meal-schedule-switcher"
            className="inline-flex flex-wrap rounded-xl bg-[#0C0C0D] p-1 border border-[#26262A] text-xs gap-0.5"
          >
            <button
              type="button"
              id="schedule-standard-btn"
              onClick={() => handleChangeScheduleMode('standard')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                scheduleMode === 'standard'
                  ? 'bg-emerald-500 text-[#051B11] font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              معمولی
            </button>
            <button
              type="button"
              id="schedule-fasting-btn"
              onClick={() => handleChangeScheduleMode('fasting_16_8')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                scheduleMode === 'fasting_16_8'
                  ? 'bg-emerald-500 text-[#051B11] font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              فستینگ ۱۶/۸
            </button>
            <button
              type="button"
              id="schedule-ramadan-btn"
              onClick={() => handleChangeScheduleMode('ramadan')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                scheduleMode === 'ramadan'
                  ? 'bg-emerald-500 text-[#051B11] font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              رمضان (سحری/افطاری)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {GOAL_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => syncInputsAndSave(p.goals)}
              className={`rounded-xl border px-3 py-2 text-right transition-colors ${
                goals.dailyKcal === p.goals.dailyKcal
                  ? 'bg-emerald-500/12 border-emerald-500/40 text-zinc-100'
                  : 'bg-[#1E1E22] border-[#2A2A31] text-zinc-300 hover:bg-[#25252B]'
              }`}
            >
              <div className="text-xs font-semibold">{p.label}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums-fa">{p.sub}</div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSaveGoals} className="space-y-3.5">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
            <div>
              <label htmlFor="goal-kcal-input" className="block text-xs text-emerald-400 mb-1.5">
                کالری روزانه
              </label>
              <input
                id="goal-kcal-input"
                type="text"
                inputMode="numeric"
                value={kcalInput}
                onChange={(e) => {
                  setKcalInput(e.target.value)
                  setLowKcalAcknowledged(false)
                }}
                className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-2.5 py-2.5 text-sm text-zinc-100 tabular-nums-fa"
              />
            </div>

            <div>
              <label htmlFor="goal-protein-input" className="block text-xs text-sky-400 mb-1.5">
                پروتئین (گ)
              </label>
              <input
                id="goal-protein-input"
                type="text"
                inputMode="numeric"
                value={proteinInput}
                onChange={(e) => setProteinInput(e.target.value)}
                className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-sky-400/70 focus:outline-none px-2.5 py-2.5 text-sm text-zinc-100 tabular-nums-fa"
              />
            </div>

            <div>
              <label htmlFor="goal-carbs-input" className="block text-xs text-amber-400 mb-1.5">
                کربوهیدرات (گ)
              </label>
              <input
                id="goal-carbs-input"
                type="text"
                inputMode="numeric"
                value={carbsInput}
                onChange={(e) => setCarbsInput(e.target.value)}
                className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-amber-400/70 focus:outline-none px-2.5 py-2.5 text-sm text-zinc-100 tabular-nums-fa"
              />
            </div>

            <div>
              <label htmlFor="goal-fat-input" className="block text-xs text-rose-400 mb-1.5">
                چربی (گ)
              </label>
              <input
                id="goal-fat-input"
                type="text"
                inputMode="numeric"
                value={fatInput}
                onChange={(e) => setFatInput(e.target.value)}
                className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-rose-400/70 focus:outline-none px-2.5 py-2.5 text-sm text-zinc-100 tabular-nums-fa"
              />
            </div>

            <div>
              <label htmlFor="goal-fiber-input" className="block text-xs text-lime-400 mb-1.5">
                فیبر (گ)
              </label>
              <input
                id="goal-fiber-input"
                type="text"
                inputMode="numeric"
                value={fiberInput}
                onChange={(e) => setFiberInput(e.target.value)}
                className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-lime-400/70 focus:outline-none px-2.5 py-2.5 text-sm text-zinc-100 tabular-nums-fa"
              />
            </div>

            <div>
              <label htmlFor="goal-water-input" className="block text-xs text-cyan-400 mb-1.5">
                آب (لیوان)
              </label>
              <input
                id="goal-water-input"
                type="text"
                inputMode="numeric"
                value={waterInput}
                onChange={(e) => setWaterInput(e.target.value)}
                className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-cyan-400/70 focus:outline-none px-2.5 py-2.5 text-sm text-zinc-100 tabular-nums-fa"
              />
            </div>
          </div>

          {/* Optional Target Weight & Micronutrient Profile Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label
                htmlFor="goal-target-weight-input"
                className="block text-xs text-zinc-300 mb-1.5"
              >
                وزن هدف اختیاری (کیلوگرم — نمایش خط مرجع روی نمودار وزن)
              </label>
              <input
                id="goal-target-weight-input"
                type="text"
                inputMode="decimal"
                value={targetWeightInput}
                onChange={(e) => setTargetWeightInput(e.target.value)}
                placeholder="مثلاً: ۷۰"
                className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-sky-400/70 focus:outline-none px-3 py-2 text-xs sm:text-sm text-zinc-100 tabular-nums-fa"
              />
            </div>

            <div>
              <span className="block text-xs text-zinc-300 mb-1.5">
                کالیبراسیون مرجع ریزمغزی‌ها (آهن، روی و ویتامین‌ها)
              </span>
              <div className="grid grid-cols-3 rounded-xl bg-[#0C0C0D] p-1 border border-[#2C2C33] text-xs">
                {(
                  [
                    { id: 'none', label: 'عمومی' },
                    { id: 'male', label: 'آقا (آهن ۸mg)' },
                    { id: 'female', label: 'خانم (آهن ۱۸mg)' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`profile-sex-${opt.id}`}
                    onClick={() => setProfileSex(opt.id)}
                    className={`py-1.5 rounded-lg font-medium transition-colors ${
                      profileSex === opt.id
                        ? 'bg-emerald-500 text-[#051B11] font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isDraftBelowSafeFloor && (
            <div
              role="status"
              data-testid="low-calorie-soft-warning"
              className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs space-y-2 leading-relaxed"
            >
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>توصیه سلامت: هدف کمتر از ۱٬۲۰۰ کالری در روز</span>
              </div>
              <p className="text-zinc-300">
                دریافت روزانه زیر ۱٬۲۰۰ کالری بدون نظارت مستقیم پزشک یا متخصص تغذیه می‌تواند منجر به
                کمبود ریزمغذی‌ها، خستگی و تحلیل عضلانی شود.
              </p>
              <button
                type="button"
                onClick={() => {
                  setKcalInput('1200')
                  setLowKcalAcknowledged(false)
                }}
                className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold px-2.5 py-1 text-[11px]"
              >
                تنظیم روی حداقل توصیه‌شده (۱٬۲۰۰ کالری)
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs text-emerald-400">
              {savedNotice ? 'اهداف و تنظیمات شخصی ذخیره شد.' : ''}
            </span>
            <button
              type="submit"
              id="save-goals-btn"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-sm px-5 py-2.5 transition-colors"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isDraftBelowSafeFloor && lowKcalAcknowledged
                  ? 'متوجه هشدار هستم، ذخیره شود'
                  : 'ذخیره اهداف'}
              </span>
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
