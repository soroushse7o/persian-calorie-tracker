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

/** Prefilled GitHub Issue link containing an anonymous user-approved local beta summary. */
export function buildAnonymousBetaIssueUrl(anonymousReportMarkdown: string): string {
  return buildIssueUrl({
    template: 'feedback.yml',
    labels: 'beta-metrics',
    title: `[گزارش ناشناس بتا] آمار کیفیت پارسر و تجربه کاربری (${CATALOG_VERSION})`,
    body: anonymousReportMarkdown,
  })
}
