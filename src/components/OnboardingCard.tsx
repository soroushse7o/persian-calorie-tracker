import { Check, Share, Smartphone, Sparkles, Target, UtensilsCrossed, X } from 'lucide-react'
import { useState } from 'react'
import type { UserGoals } from '../types/nutrition'
import { formatFaNumber } from '../utils/persianFormat'
import type { PwaStatus } from '../utils/pwa'
import { STORAGE_KEYS } from '../utils/storageMigration'

interface OnboardingStateData {
  dismissed: boolean
  goalConfirmed: boolean
}

function readOnboardingState(): OnboardingStateData {
  if (typeof window === 'undefined') {
    return { dismissed: false, goalConfirmed: false }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.onboarding)
    if (!raw) return { dismissed: false, goalConfirmed: false }
    const parsed = JSON.parse(raw) as Partial<OnboardingStateData>
    return {
      dismissed: Boolean(parsed.dismissed),
      goalConfirmed: Boolean(parsed.goalConfirmed),
    }
  } catch {
    return { dismissed: false, goalConfirmed: false }
  }
}

function writeOnboardingState(next: OnboardingStateData): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.onboarding, JSON.stringify(next))
  } catch {
    // Ignore storage error
  }
}

interface OnboardingCardProps {
  goals: UserGoals
  entriesCount: number
  pwaStatus: PwaStatus
  onUpdateGoals: (goals: UserGoals) => void
  onTrySamplePhrase: (phrase: string) => void
  onOpenCalculatorInSettings: () => void
}

const QUICK_GOAL_OPTIONS: Array<{ label: string; kcal: number; goals: UserGoals }> = [
  {
    label: 'کاهش ملایم',
    kcal: 1600,
    goals: { dailyKcal: 1600, proteinGrams: 115, carbsGrams: 160, fatGrams: 55, waterGoalGlasses: 8 },
  },
  {
    label: 'متعادل روزمره',
    kcal: 2000,
    goals: { dailyKcal: 2000, proteinGrams: 120, carbsGrams: 230, fatGrams: 65, waterGoalGlasses: 8 },
  },
  {
    label: 'افزایش انرژی/حجم',
    kcal: 2500,
    goals: { dailyKcal: 2500, proteinGrams: 155, carbsGrams: 300, fatGrams: 75, waterGoalGlasses: 10 },
  },
]

/**
 * Non-blocking 3-step Persian onboarding card:
 * Step 1: تعیین هدف روزانه -> Step 2: ثبت اولین وعده -> Step 3: نصب آفلاین روی صفحه اصلی (Android / iOS).
 */
export function OnboardingCard({
  goals,
  entriesCount,
  pwaStatus,
  onUpdateGoals,
  onTrySamplePhrase,
  onOpenCalculatorInSettings,
}: OnboardingCardProps) {
  const [state, setState] = useState<OnboardingStateData>(readOnboardingState)

  if (state.dismissed) return null
  if (state.goalConfirmed && entriesCount > 0 && pwaStatus.isInstalled) return null

  const updateState = (patch: Partial<OnboardingStateData>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      writeOnboardingState(next)
      return next
    })
  }

  const activeStep: 1 | 2 | 3 = !state.goalConfirmed ? 1 : entriesCount === 0 ? 2 : 3

  return (
    <section
      aria-label="راهنمای شروع سه‌مرحله‌ای"
      data-testid="onboarding-card"
      className="card-surface rounded-2xl p-4 border border-emerald-500/25 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <h2 className="text-xs sm:text-sm font-bold text-zinc-100">
            شروع سریع در ۳ گام کوتاه
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] tabular-nums-fa">
            {[1, 2, 3].map((step) => {
              const done =
                (step === 1 && state.goalConfirmed) ||
                (step === 2 && entriesCount > 0) ||
                (step === 3 && pwaStatus.isInstalled)
              const current = activeStep === step
              return (
                <span
                  key={step}
                  className={`w-5 h-5 rounded-full inline-flex items-center justify-center font-bold ${
                    done
                      ? 'bg-emerald-500 text-[#051B11]'
                      : current
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'bg-[#1E1E22] text-zinc-500'
                  }`}
                >
                  {done ? '✓' : formatFaNumber(step)}
                </span>
              )
            })}
          </div>
          <button
            type="button"
            id="dismiss-onboarding-btn"
            onClick={() => updateState({ dismissed: true })}
            aria-label="بستن دائمی راهنمای شروع"
            className="inline-flex items-center gap-1 rounded-lg bg-[#1E1E22] hover:bg-[#282830] text-zinc-300 px-2 py-1 text-[11px]"
          >
            <span>بستن</span>
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {activeStep === 1 && (
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>گام ۱: هدف تقریبی کالری روزانه خود را انتخاب کنید (قابل تغییر در تنظیمات):</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.kcal}
                type="button"
                onClick={() => {
                  onUpdateGoals(opt.goals)
                  updateState({ goalConfirmed: true })
                }}
                className={`rounded-xl border p-2 text-right transition-colors ${
                  goals.dailyKcal === opt.kcal
                    ? 'bg-emerald-500/14 border-emerald-500/45 text-zinc-100'
                    : 'bg-[#1E1E22] border-[#2C2C33] text-zinc-300 hover:bg-[#26262E]'
                }`}
              >
                <div className="font-semibold text-[11px] sm:text-xs">{opt.label}</div>
                <div className="text-[11px] text-emerald-400 tabular-nums-fa mt-0.5">
                  {formatFaNumber(opt.kcal)} کالری
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-[11px]">
            <button
              type="button"
              onClick={onOpenCalculatorInSettings}
              className="text-amber-300 hover:underline"
            >
              محاسبه دقیق‌تر بر اساس قد و وزن (+۱۸)
            </button>
            <button
              type="button"
              onClick={() => updateState({ goalConfirmed: true })}
              className="text-emerald-400 font-semibold hover:underline"
            >
              ادامه با {formatFaNumber(goals.dailyKcal)} کالری ←
            </button>
          </div>
        </div>
      )}

      {activeStep === 2 && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
            <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400" />
            <span>گام ۲: اولین وعده خود را به فارسی روزمره امتحان کنید:</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            کافی است در کادر بالا بنویسید چه خورده‌اید یا نمونه زیر را لمس کنید و دکمه «ثبت وعده» را
            بزنید:
          </p>
          <button
            type="button"
            onClick={() =>
              onTrySamplePhrase('دو کفگیر قورمه‌سبزی و یک کف دست سنگک و نصف لیوان دوغ')
            }
            className="w-full rounded-xl bg-emerald-500/12 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-2 text-right text-emerald-200 font-medium transition-colors"
          >
            امتحان نمونه: «دو کفگیر قورمه‌سبزی و یک کف دست سنگک و نصف لیوان دوغ»
          </button>
        </div>
      )}

      {activeStep === 3 && (
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>گام ۳: افزودن به صفحه اصلی موبایل برای دسترسی آنی و آفلاین</span>
          </div>

          {pwaStatus.canInstall ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-400">
                بدون نیاز به اینترنت و بدون اشغال حافظه گوشی اجرا می‌شود.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void pwaStatus.promptInstall()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 text-[#051B11] font-bold px-3.5 py-2 text-xs"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>نصب روی صفحه اصلی</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateState({ dismissed: true })}
                  className="rounded-xl bg-[#1E1E22] text-zinc-300 px-3 py-2 text-xs"
                >
                  اتمام راهنما
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-[#0C0C0D] border border-[#26262C] p-3 space-y-2 text-[11px] text-zinc-300 leading-relaxed">
              <div className="flex items-center gap-1.5 text-sky-300 font-semibold">
                <Share className="w-3.5 h-3.5" />
                <span>
                  {pwaStatus.isIosInstallable
                    ? 'راهنمای نصب روی آیفون و آیپد (Safari):'
                    : 'راهنمای افزودن به صفحه اصلی:'}
                </span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                <li>
                  در مرورگر سافاری آیفون، دکمه اشتراک‌گذاری (<strong>Share</strong>) پایین صفحه را
                  بزنید (در اندروید منوی سه‌نقطه بالا).
                </li>
                <li>
                  گزینه <strong>Add to Home Screen</strong> (افزودن به صفحه اصلی) را انتخاب کرده و{' '}
                  <strong>Add</strong> را بزنید.
                </li>
              </ol>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => updateState({ dismissed: true })}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 text-[#051B11] font-bold px-3 py-1.5 text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>متوجه شدم، شروع استفاده</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
