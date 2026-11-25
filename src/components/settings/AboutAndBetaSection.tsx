import { Activity, Check, Copy, ExternalLink, Lock, MessageSquarePlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { APP_CONFIG } from '../../config/env'
import {
  buildAnonymousBetaIssueUrl,
  buildGeneralFeedbackIssueUrl,
  buildMissingFoodIssueUrl,
} from '../../config/feedback'
import { CATALOG_VERSION, NUTRITION_DATA_SOURCES } from '../../data/iranianFoods'
import type { LoggedFoodEntry } from '../../types/nutrition'
import { HEALTH_DISCLAIMERS } from '../../utils/calorieCalculator'
import {
  buildAnonymousBetaMarkdownReport,
  clearLocalBetaMetrics,
  computeBetaSummary,
  readLocalBetaMetrics,
} from '../../utils/localMetrics'
import { formatFaNumber, getLocalDateKey } from '../../utils/persianFormat'

interface AboutAndBetaSectionProps {
  entries: LoggedFoodEntry[]
}

export function AboutAndBetaSection({ entries }: AboutAndBetaSectionProps) {
  const [metricsRev, setMetricsRev] = useState(0)
  const [betaCopied, setBetaCopied] = useState(false)

  const betaSummary = useMemo(() => {
    void metricsRev
    const raw = readLocalBetaMetrics()
    return computeBetaSummary(raw, entries, getLocalDateKey())
  }, [entries, metricsRev])

  const betaReportMarkdown = useMemo(
    () => buildAnonymousBetaMarkdownReport(betaSummary),
    [betaSummary],
  )

  const handleCopyBetaReport = async () => {
    try {
      await navigator.clipboard.writeText(betaReportMarkdown)
      setBetaCopied(true)
      window.setTimeout(() => setBetaCopied(false), 2000)
    } catch {
      // Ignore clipboard failure
    }
  }

  return (
    <div className="space-y-4">
      <section className="card-surface rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-400">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">بازخورد و بهبود بانک غذاها</h2>
              <p className="text-[11px] text-zinc-400">
                گزارش مستقیم غذای ناموجود، اصلاح کالری یا پیشنهاد قابلیت جدید در گیت‌هاب
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={buildMissingFoodIssueUrl('')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#282830] border border-[#2E2E36] px-3 py-2 text-xs font-semibold text-amber-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>غذای ناموجود / اشتباه</span>
            </a>
            <a
              href={buildGeneralFeedbackIssueUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#282830] border border-[#2E2E36] px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>ارسال بازخورد</span>
            </a>
          </div>
        </div>

        <div
          data-testid="local-beta-metrics-card"
          className="rounded-xl bg-[#0C0C0D] border border-[#24242B] p-3.5 space-y-2.5 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>آمار کیفیت پارسر روی دستگاه شما (۱۰۰٪ محلی و بدون ارسال خودکار)</span>
            </div>
            <span className="text-[11px] text-zinc-400 tabular-nums-fa">
              نرخ عدم تشخیص: {formatFaNumber(betaSummary.unmatchedRatePct, 1)}٪
            </span>
          </div>

          <div className="text-[11px] text-zinc-400 tabular-nums-fa">
            ثبت‌ها: {formatFaNumber(betaSummary.totalSubmissions)} نوبت · روزهای فعال:{' '}
            {formatFaNumber(betaSummary.activeDaysCount)} · عبارات تشخیص‌داده‌نشده:{' '}
            {formatFaNumber(betaSummary.topUnmatched.length)} مورد
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleCopyBetaReport()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#1E1E22] hover:bg-[#27272E] border border-[#2E2E36] px-2.5 py-1.5 text-[11px] text-zinc-200"
            >
              {betaCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>کپی گزارش ناشناس بتا</span>
                </>
              )}
            </button>
            <a
              href={buildAnonymousBetaIssueUrl(betaReportMarkdown)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 font-semibold px-2.5 py-1.5 text-[11px]"
            >
              <ExternalLink className="w-3 h-3" />
              <span>ارسال داوطلبانه در گیت‌هاب</span>
            </a>
            {(betaSummary.totalSubmissions > 0 || betaSummary.totalUnmatchedCount > 0) && (
              <button
                type="button"
                onClick={() => {
                  clearLocalBetaMetrics()
                  setMetricsRev((r) => r + 1)
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 mr-auto"
              >
                پاک کردن آمار محلی
              </button>
            )}
          </div>
        </div>
      </section>

      <section
        id="privacy-and-health-section"
        data-testid="privacy-and-health-card"
        className="card-surface rounded-2xl p-4 sm:p-5 space-y-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">
              حریم خصوصی، منابع علمی و مجوز انتشار
            </h2>
            <p className="text-[11px] text-zinc-400">
              نسخه کاتالوگ {CATALOG_VERSION} — متن‌باز با مجوز MIT ·{' '}
              <a
                href={APP_CONFIG.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline font-medium"
              >
                @soroushse7o
              </a>{' '}
              ·{' '}
              <a
                href={APP_CONFIG.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline font-medium"
              >
                مخزن گیت‌هاب
              </a>
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-zinc-300 leading-relaxed">
          <p>
            <strong className="text-zinc-100">حریم خصوصی ۱۰۰٪ محلی و بدون ردیابی:</strong> تمام
            وعده‌ها، اهداف، وزن و غذاهای شخصی شما فقط روی همین دستگاه (`localStorage` + `IndexedDB`)
            ذخیره می‌شوند. هیچ ثبت‌نامی وجود ندارد و هیچ اطلاعاتی بدون کلیک صریح شما ارسال نمی‌شود.
          </p>
          <p>
            <strong className="text-zinc-100">سلب مسئولیت پزشکی:</strong>{' '}
            {HEALTH_DISCLAIMERS.educationalNotice} {HEALTH_DISCLAIMERS.specialGroupsWarning}
          </p>
          <div>
            <strong className="text-zinc-100">منابع ارزش‌های غذایی (برآورد تقریبی):</strong>
            <ul className="list-disc list-inside text-zinc-400 mt-1 space-y-0.5">
              {NUTRITION_DATA_SOURCES.detailedSources.map((src) => (
                <li key={src}>{src}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
