import type { UserGoals } from '../types/nutrition'

export type BiologicalSex = 'male' | 'female'

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'

export type WeightGoal = 'lose' | 'maintain' | 'gain'

export const MIN_CALCULATOR_AGE = 18
export const MAX_CALCULATOR_AGE = 95

export const HEALTH_DISCLAIMERS = {
  educationalNotice:
    'کالری شمار روزمره صرفاً یک ابزار آموزشی و اطلاع رسانی برای برآورد تقریبی تغذیه است و جایگزین مشاوره، تشخیص یا تجویز پزشک و متخصص تغذیه نیست.',
  specialGroupsWarning:
    'هشدار مهم سلامتی: در صورت بارداری، شیردهی، سن زیر ۱۸ سال، سابقه یا علائم اختلالات خوردن (Eating Disorders)، دیابت یا بیماری های مزمن، از دنبال کردن رژیم های کاهش وزن خودسرانه خودداری کرده و حتماً با پزشک یا کارشناس تغذیه مشورت کنید.',
  underageBlockMessage:
    'محاسبه گر کالری و کاهش وزن فقط برای بزرگسالان ۱۸ سال به بالا طراحی شده است. برای کودکان و نوجوانان زیر ۱۸ سال تعیین نیاز تغذیه ای باید صرفاً زیر نظر پزشک یا متخصص تغذیه انجام شود.',
  invalidInputMessage:
    'اطلاعات واردشده معتبر نیستند. لطفاً قد، وزن، جنسیت، سطح فعالیت و هدف را به درستی مشخص کنید.',
} as const

export interface TdeeInput {
  sex: BiologicalSex
  ageYears: number
  heightCm: number
  weightKg: number
  activity: ActivityLevel
  goal: WeightGoal
}

export interface TdeeResult {
  bmr: number
  tdee: number
  recommendedGoals: UserGoals
}

export type TdeeEvaluation =
  | { ok: true; result: TdeeResult }
  | { ok: false; error: string }

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, { title: string; hint: string }> = {
  sedentary: { title: 'کم‌تحرک', hint: 'کار پشت‌میزی، بدون ورزش منظم' },
  light: { title: 'تحرک سبک', hint: '۱ تا ۳ روز پیاده‌روی یا ورزش در هفته' },
  moderate: { title: 'تحرک متوسط', hint: '۳ تا ۵ روز ورزش در هفته' },
  active: { title: 'پرتحرک', hint: '۶ تا ۷ روز تمرین منظم در هفته' },
  very_active: { title: 'خیلی پرتحرک', hint: 'فعالیت بدنی سنگین یا تمرین روزانه دو نوبت' },
}

export const WEIGHT_GOAL_LABELS: Record<WeightGoal, { title: string; deltaText: string }> = {
  lose: { title: 'کاهش وزن اصولی', deltaText: 'کسر کالری ملایم و حفظ عضله' },
  maintain: { title: 'تثبیت وزن', deltaText: 'متعادل با نیاز روزانه بدن' },
  gain: { title: 'افزایش وزن / عضله', deltaText: 'مازاد کالری کنترل‌شده' },
}

/**
 * Validates age (18+ strictly enforced) and computes BMR (Mifflin-St Jeor),
 * TDEE, balanced macro targets, and daily water glasses.
 */
export function evaluateTdeeGoals(input: TdeeInput): TdeeEvaluation {
  if (!Number.isFinite(input.ageYears) || input.ageYears < MIN_CALCULATOR_AGE) {
    return { ok: false, error: HEALTH_DISCLAIMERS.underageBlockMessage }
  }
  if (!Number.isFinite(input.heightCm) || !Number.isFinite(input.weightKg)) {
    return { ok: false, error: HEALTH_DISCLAIMERS.invalidInputMessage }
  }
  if (
    (input.sex !== 'male' && input.sex !== 'female') ||
    !Object.hasOwn(ACTIVITY_MULTIPLIERS, input.activity) ||
    !Object.hasOwn(WEIGHT_GOAL_LABELS, input.goal)
  ) {
    return { ok: false, error: HEALTH_DISCLAIMERS.invalidInputMessage }
  }

  const age = Math.min(MAX_CALCULATOR_AGE, Math.round(input.ageYears))
  const height = Math.max(120, Math.min(230, input.heightCm))
  const weight = Math.max(35, Math.min(220, input.weightKg))

  const sexOffset = input.sex === 'male' ? 5 : -161
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + sexOffset)
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[input.activity])

  let targetKcal = tdee
  if (input.goal === 'lose') {
    targetKcal = Math.round(tdee - Math.min(500, Math.max(300, tdee * 0.18)))
    const floor = input.sex === 'male' ? 1400 : 1200
    targetKcal = Math.max(floor, targetKcal)
  } else if (input.goal === 'gain') {
    targetKcal = Math.round(tdee + Math.min(400, Math.max(250, tdee * 0.12)))
  }

  targetKcal = Math.round(targetKcal / 10) * 10

  const proteinPerKg = input.goal === 'lose' ? 1.8 : input.goal === 'gain' ? 1.7 : 1.5
  const rawProtein = Math.round(weight * proteinPerKg)
  const maxProtein = Math.round((targetKcal * 0.35) / 4)
  const proteinGrams = Math.max(55, Math.min(maxProtein, rawProtein))

  const fatGrams = Math.max(35, Math.round((targetKcal * 0.27) / 9))

  const remainingKcal = Math.max(200, targetKcal - proteinGrams * 4 - fatGrams * 9)
  const carbsGrams = Math.round(remainingKcal / 4)

  const fiberGrams = Math.max(22, Math.min(45, Math.round((targetKcal / 1000) * 14)))
  const waterGoalGlasses = Math.max(6, Math.min(14, Math.round((weight * 32) / 240)))

  return {
    ok: true,
    result: {
      bmr,
      tdee,
      recommendedGoals: {
        dailyKcal: targetKcal,
        proteinGrams,
        carbsGrams,
        fatGrams,
        fiberGrams,
        waterGoalGlasses,
        sex: input.sex,
        ageYears: age,
      },
    },
  }
}

/** Convenience wrapper for adult (18+) inputs; throws if age < 18. */
export function calculateRecommendedGoals(input: TdeeInput): TdeeResult {
  const evaluated = evaluateTdeeGoals(input)
  if (!evaluated.ok) {
    throw new Error(evaluated.error)
  }
  return evaluated.result
}
