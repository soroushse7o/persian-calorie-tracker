import { APP_CONFIG } from './env'
import { CATALOG_VERSION } from '../data/iranianFoods'
import type { FoodItem } from '../types/nutrition'

function repoIssuesNewBase(): string {
  const cleanRepo = APP_CONFIG.repoUrl.replace(/\/+$/, '')
  return `${cleanRepo}/issues/new`
}

function buildIssueUrl(params: Record<string, string>): string {
  const search = new URLSearchParams(params)
  return `${repoIssuesNewBase()}?${search.toString()}`
}

/** Prefilled GitHub Issue link for reporting a missing Iranian food or dish. */
export function buildMissingFoodIssueUrl(foodPhrase: string): string {
  const clean = foodPhrase.trim().slice(0, 80) || 'غذای جدید'
  return buildIssueUrl({
    template: 'food-data.yml',
    labels: 'food-catalog',
    title: `[غذای ناموجود] افزودن «${clean}» به بانک غذاها`,
    body: [
      `### نام غذا یا خوراکی پیشنهادی`,
      `${clean}`,
      ``,
      `### واحد مرسوم خانگی (مثلاً کفگیر، پیاله، کف دست، بسته)`,
      ``,
      `### کالری یا برچسب ارزش غذایی (در صورت اطلاع — اختیاری)`,
      ``,
      `---`,
      `نسخه کاتالوگ: \`${CATALOG_VERSION}\``,
    ].join('\n'),
  })
}

/** Prefilled GitHub Issue link for reporting inaccurate calories/units on an existing food item. */
export function buildWrongFoodDataIssueUrl(food: FoodItem): string {
  return buildIssueUrl({
    template: 'food-data.yml',
    labels: 'food-catalog',
    title: `[اصلاح غذا] بررسی کالری یا واحد «${food.name}» (${food.id})`,
    body: [
      `### مشخصات فعلی در برنامه`,
      `- شناسه: \`${food.id}\``,
      `- نام: **${food.name}**`,
      `- در ۱۰۰ گرم فعلی: \`${food.per100g.kcal} kcal | P:${food.per100g.protein}g | C:${food.per100g.carbs}g | F:${food.per100g.fat}g\``,
      `- واحد پیش‌فرض فعلی: \`${food.defaultUnit}\``,
      `- منبع ثبت‌شده: ${food.source ?? 'برآورد تقریبی'}`,
      ``,
      `### مقدار صحیح پیشنهادی و منبع مرجع (برچسب محصول / جدول تغذیه)`,
      ``,
      `---`,
      `نسخه کاتالوگ: \`${CATALOG_VERSION}\``,
    ].join('\n'),
  })
}

/** Prefilled GitHub Issue link for general user feedback, bug reports, or UX suggestions. */
export function buildGeneralFeedbackIssueUrl(): string {
  return buildIssueUrl({
    template: 'feedback.yml',
    labels: 'feedback',
    title: '[بازخورد کاربری] پیشنهاد یا گزارش مشکل',
    body: [
      `### شرح پیشنهاد یا مشکل مشاهده‌شده`,
      ``,
      `### نوع دستگاه و مرورگر (اختیاری — مثلاً iOS Safari یا Android Chrome)`,
      ``,
      `---`,
      `نسخه کاتالوگ: \`${CATALOG_VERSION}\``,
    ].join('\n'),
  })
}

/**
 * Prefilled GitHub Issue link containing a redacted, user-reviewed local beta
 * report. The body is the exact markdown text the user just inspected.
 *
 * NOTE: this URL must only be opened after the user has seen and confirmed the
 * report; see `buildAnonymousBetaIssueUrl` which enforces that preview step.
 */
export function buildReviewedBetaIssueUrl(reviewedReportMarkdown: string): string {
  return buildIssueUrl({
    template: 'feedback.yml',
    labels: 'beta-metrics',
    title: `[گزارش محلی پالایششده بتا] آمار کیفیت پارسر و تجربه کاربری (${CATALOG_VERSION})`,
    body: reviewedReportMarkdown,
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const MAX_CACHED_PREVIEWS = 24
const previewCache = new Map<string, string>()

/**
 * Returns a local, script-free preview page that shows the EXACT generated report
 * and requires an explicit click before the GitHub issue page is opened. Nothing
 * is transmitted by this step. A blob URL is used because the existing settings
 * UI renders this function's result directly as an `<a href>` and is owned by
 * another agent; no JS is embedded, so the site's strict CSP still applies.
 * Falls back to the direct issue URL if object URLs are unavailable.
 */
export function buildAnonymousBetaIssueUrl(reviewedReportMarkdown: string): string {
  const githubUrl = buildReviewedBetaIssueUrl(reviewedReportMarkdown)
  if (
    typeof URL === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return githubUrl
  }

  const cached = previewCache.get(reviewedReportMarkdown)
  if (cached) return cached

  const safeReport = escapeHtml(reviewedReportMarkdown)
  const safeGithubUrl = escapeHtml(githubUrl)
  const html = [
    '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>بررسی دقیق گزارش قبل از ارسال</title>',
    '<style>body{font-family:system-ui,sans-serif;background:#121214;color:#e4e4e7;',
    'margin:0;padding:2rem;line-height:1.8}main{max-width:48rem;margin:auto}',
    'pre{white-space:pre-wrap;word-break:break-word;background:#1c1c1f;',
    'border:1px solid #33333a;border-radius:12px;padding:1rem;font-size:.9rem}',
    'a.confirm{display:inline-block;margin-top:1rem;background:#0ea5e9;color:#04121c;',
    'padding:.65rem 1rem;border-radius:10px;font-weight:700;text-decoration:none}</style></head><body><main>',
    '<h1>پیش از ارسال، متن دقیق گزارش را بررسی کنید</h1>',
    '<p>هیچ اطلاعاتی تا زمانی که خودتان روی دکمه تأیید کلیک نکنید ارسال نمیشود. ',
    'متن زیر دقیقاً همان چیزی است که در صفحه گیتهاب قرار میگیرد؛ ',
    'اگر نیاز به پالایش بیشتر دارید، این برگه را ببندید و از ارسال صرفنظر کنید.</p>',
    `<pre id="exact-report">${safeReport}</pre>`,
    `<a class="confirm" href="${safeGithubUrl}">تأیید کردم — باز کردن صفحه ارسال در گیتهاب</a>`,
    '<p>برای انصراف کافی است این برگه را ببندید.</p>',
    '</main></body></html>',
  ].join('')

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  previewCache.set(reviewedReportMarkdown, url)
  if (previewCache.size > MAX_CACHED_PREVIEWS) {
    const oldest = previewCache.keys().next().value
    if (oldest !== undefined) {
      const stale = previewCache.get(oldest)
      if (stale && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(stale)
      previewCache.delete(oldest)
    }
  }
  return url
}
