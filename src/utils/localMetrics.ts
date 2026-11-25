import { CATALOG_VERSION } from '../data/iranianFoods'
import type { LoggedFoodEntry } from '../types/nutrition'
import { formatFaNumber } from './persianFormat'
import { STORAGE_KEYS } from './storageMigration'

export interface LocalBetaMetrics {
  firstSeenDateKey: string | null
  totalSubmissions: number
  totalParsedItems: number
  totalUnmatchedCount: number
  /** Map of sanitized unmatched phrase -> occurrence count (capped to 30 entries, local-only) */
  unmatchedPhrases: Record<string, number>
}

export interface ComputedBetaSummary {
  totalSubmissions: number
  totalParsedItems: number
  totalUnmatchedCount: number
  unmatchedRatePct: number
  activeDaysCount: number
  spanDays: number
  avgLogsPerActiveDay: number
  retentionRatioPct: number
  topUnmatched: Array<{ phrase: string; count: number }>
}

const MAX_STORED_PHRASES = 30
const MAX_PHRASE_LEN = 36

/**
 * Terms that must never survive into a stored/logged free-text phrase.
 * Health conditions and personal names are redacted as whole tokens so food
 * words that merely share a prefix (e.g. «رژیمی») are not mangled.
 */
const SENSITIVE_TERMS: readonly string[] = [
  // Health / medical context
  'دیابت',
  'قند خون',
  'فشار خون',
  'چربی خون',
  'کلسترول',
  'سرطان',
  'بیماری',
  'کلیه',
  'کبد',
  'قلب',
  'تیروئید',
  'آلرژی',
  'حساسیت',
  'باردار',
  'شیردهی',
  'کم خونی',
  'چاقی',
  'لاغری',
  'رژیم',
  'دارو',
  'قرص',
  'انسولین',
  'مسکن',
  'دکتر',
  'پزشک',
  'diabetes',
  'cancer',
  'allergy',
  'pregnant',
  'cholesterol',
  'medication',
  'insulin',
  // Common Iranian given/family names (redacted as standalone tokens)
  'محمد',
  'علی',
  'حسن',
  'حسین',
  'احمد',
  'مریم',
  'فاطمه',
  'زهرا',
  'رضا',
  'کریم',
  'احمدی',
  'محمدی',
  'حسینی',
  'کریمی',
  'رضایی',
  'علیپور',
]

const REDACTED = '[ردشده]'

function redactSensitiveTerms(text: string): string {
  let out = text
  for (const term of SENSITIVE_TERMS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`(^|\\s)${escaped}($|\\s)`, 'gi'), `$1${REDACTED}$2`)
  }
  return out
}

function createEmptyMetrics(): LocalBetaMetrics {
  return {
    firstSeenDateKey: null,
    totalSubmissions: 0,
    totalParsedItems: 0,
    totalUnmatchedCount: 0,
    unmatchedPhrases: {},
  }
}

/** Scrubs URLs/emails/phone numbers/names/health terms and truncates phrase length. */
export function sanitizeUnmatchedPhraseForLocalLog(raw: string): string | null {
  let cleaned = raw
    .replace(/https?:\/\/\S+|www\.\S+/gi, '')
    .replace(/\S+@\S+\.\S+/g, '')
    .replace(/@[\p{L}\p{N}_]{2,}/gu, '')
    .replace(/(آقای|خانم|دکتر|جناب|پروفسور|استاد)\s+\S+/g, REDACTED)
    .replace(/(?:اسم|نام)\s+من\s+\S+/g, REDACTED)
    .replace(/\S+@\S+/g, '')
    .replace(/[0-9۰-۹٠-٩]{4,}/g, '')
  cleaned = redactSensitiveTerms(cleaned)
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/(\[ردشده\]\s*){2,}/g, REDACTED)
    .trim()
    .slice(0, MAX_PHRASE_LEN)
  return cleaned.length >= 2 ? cleaned : null
}

export function readLocalBetaMetrics(
  storage: Pick<Storage, 'getItem'> | null =
    typeof window !== 'undefined' ? window.localStorage : null,
): LocalBetaMetrics {
  if (!storage) return createEmptyMetrics()
  try {
    const raw = storage.getItem(STORAGE_KEYS.localMetrics)
    if (!raw) return createEmptyMetrics()
    const parsed = JSON.parse(raw) as Partial<LocalBetaMetrics>
    if (!parsed || typeof parsed !== 'object') return createEmptyMetrics()

    const cleanPhrases: Record<string, number> = {}
    if (parsed.unmatchedPhrases && typeof parsed.unmatchedPhrases === 'object') {
      for (const [k, v] of Object.entries(parsed.unmatchedPhrases)) {
        const s = sanitizeUnmatchedPhraseForLocalLog(k)
        if (s && typeof v === 'number' && Number.isFinite(v) && v > 0) {
          cleanPhrases[s] = Math.round(v)
        }
      }
    }

    return {
      firstSeenDateKey:
        typeof parsed.firstSeenDateKey === 'string' ? parsed.firstSeenDateKey : null,
      totalSubmissions:
        typeof parsed.totalSubmissions === 'number' && parsed.totalSubmissions >= 0
          ? Math.round(parsed.totalSubmissions)
          : 0,
      totalParsedItems:
        typeof parsed.totalParsedItems === 'number' && parsed.totalParsedItems >= 0
          ? Math.round(parsed.totalParsedItems)
          : 0,
      totalUnmatchedCount:
        typeof parsed.totalUnmatchedCount === 'number' && parsed.totalUnmatchedCount >= 0
          ? Math.round(parsed.totalUnmatchedCount)
          : 0,
      unmatchedPhrases: cleanPhrases,
    }
  } catch {
    return createEmptyMetrics()
  }
}

function writeLocalBetaMetrics(
  metrics: LocalBetaMetrics,
  storage: Pick<Storage, 'setItem'> | null =
    typeof window !== 'undefined' ? window.localStorage : null,
): void {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEYS.localMetrics, JSON.stringify(metrics))
  } catch {
    // Non-critical local metric write; never interrupt user flow
  }
}

/**
 * Records a meal submission event locally (matched item count + any unmatched segments
 * present when user submitted or clicked "Add missing food"). Zero network transmission.
 */
export function recordLocalSubmissionMetrics(
  params: {
    dateKey: string
    parsedItemsCount: number
    unmatchedSegments: string[]
  },
  storage: Pick<Storage, 'getItem' | 'setItem'> | null =
    typeof window !== 'undefined' ? window.localStorage : null,
): LocalBetaMetrics {
  const prev = readLocalBetaMetrics(storage)
  const nextPhrases: Record<string, number> = { ...prev.unmatchedPhrases }

  let validUnmatchedAdded = 0
  for (const seg of params.unmatchedSegments) {
    const clean = sanitizeUnmatchedPhraseForLocalLog(seg)
    if (!clean) continue
    validUnmatchedAdded++
    if (nextPhrases[clean] !== undefined) {
      nextPhrases[clean] += 1
    } else if (Object.keys(nextPhrases).length < MAX_STORED_PHRASES) {
      nextPhrases[clean] = 1
    }
  }

  const updated: LocalBetaMetrics = {
    firstSeenDateKey: prev.firstSeenDateKey ?? params.dateKey,
    totalSubmissions: prev.totalSubmissions + 1,
    totalParsedItems: prev.totalParsedItems + Math.max(0, params.parsedItemsCount),
    totalUnmatchedCount: prev.totalUnmatchedCount + validUnmatchedAdded,
    unmatchedPhrases: nextPhrases,
  }

  writeLocalBetaMetrics(updated, storage)
  return updated
}

export function recordUnmatchedPhraseTap(
  phrase: string,
  dateKey: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null =
    typeof window !== 'undefined' ? window.localStorage : null,
): LocalBetaMetrics {
  const prev = readLocalBetaMetrics(storage)
  const clean = sanitizeUnmatchedPhraseForLocalLog(phrase)
  if (!clean) return prev

  const nextPhrases = { ...prev.unmatchedPhrases }
  if (nextPhrases[clean] !== undefined) {
    nextPhrases[clean] += 1
  } else if (Object.keys(nextPhrases).length < MAX_STORED_PHRASES) {
    nextPhrases[clean] = 1
  }

  const updated: LocalBetaMetrics = {
    ...prev,
    firstSeenDateKey: prev.firstSeenDateKey ?? dateKey,
    totalUnmatchedCount: prev.totalUnmatchedCount + 1,
    unmatchedPhrases: nextPhrases,
  }
  writeLocalBetaMetrics(updated, storage)
  return updated
}

export function clearLocalBetaMetrics(
  storage: Partial<Pick<Storage, 'removeItem'>> | null =
    typeof window !== 'undefined' ? window.localStorage : null,
): void {
  try {
    storage?.removeItem?.(STORAGE_KEYS.localMetrics)
  } catch {
    // Ignore
  }
}

function diffDaysInclusive(startKey: string, endKey: string): number {
  const a = Date.parse(`${startKey}T00:00:00Z`)
  const b = Date.parse(`${endKey}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 1
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}

export function computeBetaSummary(
  metrics: LocalBetaMetrics,
  entries: LoggedFoodEntry[],
  todayKey: string,
): ComputedBetaSummary {
  const totalSegments = metrics.totalParsedItems + metrics.totalUnmatchedCount
  const unmatchedRatePct =
    totalSegments > 0 ? Math.round((metrics.totalUnmatchedCount / totalSegments) * 1000) / 10 : 0

  const distinctDays = Array.from(new Set(entries.map((e) => e.dateKey))).sort()
  const activeDaysCount = distinctDays.length
  const earliestDay = distinctDays[0] ?? metrics.firstSeenDateKey ?? todayKey
  const spanDays = diffDaysInclusive(earliestDay, todayKey)
  const avgLogsPerActiveDay =
    activeDaysCount > 0 ? Math.round((entries.length / activeDaysCount) * 10) / 10 : 0
  const retentionRatioPct =
    activeDaysCount > 0 ? Math.min(100, Math.round((activeDaysCount / spanDays) * 100)) : 0

  const topUnmatched = Object.entries(metrics.unmatchedPhrases)
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  return {
    totalSubmissions: metrics.totalSubmissions,
    totalParsedItems: metrics.totalParsedItems,
    totalUnmatchedCount: metrics.totalUnmatchedCount,
    unmatchedRatePct,
    activeDaysCount,
    spanDays,
    avgLogsPerActiveDay,
    retentionRatioPct,
    topUnmatched,
  }
}

/**
 * Builds the exact, redacted local beta report. It deliberately contains no raw
 * free text: unmatched phrases were sanitized on write and re-sanitized on read.
 * The full generated text is shown to the user for review before any issue link
 * is opened (see `buildAnonymousBetaIssueUrl` in config/feedback.ts).
 */
export function buildRedactedBetaMarkdownReport(summary: ComputedBetaSummary): string {
  const unmatchedLines =
    summary.topUnmatched.length > 0
      ? summary.topUnmatched
          .map((item) => `- «${item.phrase}» (${formatFaNumber(item.count)} بار)`)
          .join('\n')
      : '- موردی ثبت نشده است'

  return [
    `### گزارش محلی پالایش‌شده کیفیت پارسر و تجربه کاربری`,
    `تنها برچسبهای پالایششده (بدون متن آزاد خام) — هیچ ارسال خودکاری صورت نمیگیرد.`,
    `همان متنی که در ادامه میبینید، پیش از باز کردن لینک گیتهاب دقیقاً برای تأیید به شما نمایش داده میشود.`,
    ``,
    `- نسخه کاتالوگ: \`${CATALOG_VERSION}\``,
    `- تعداد دفعات ثبت وعده: ${formatFaNumber(summary.totalSubmissions)}`,
    `- کل اقلام تشخیص\u200cdاده\u200cشده: ${formatFaNumber(summary.totalParsedItems)}`,
    `- نرخ «غذای ناموجود / تشخیص\u200cdاده\u200cنشده»: ${formatFaNumber(summary.unmatchedRatePct, 1)}٪ (${formatFaNumber(summary.totalUnmatchedCount)} عبارت)`,
    `- روزهای فعال ثبت: ${formatFaNumber(summary.activeDaysCount)} از ${formatFaNumber(summary.spanDays)} روز (${formatFaNumber(summary.retentionRatioPct)}٪ بازگشت)`,
    `- میانگین آیتم ثبت\u200cشده در هر روز فعال: ${formatFaNumber(summary.avgLogsPerActiveDay, 1)}`,
    ``,
    `### برچسبهای پالایششده غذاهای تشخیص\u200cdاده\u200cنشده (اطلاعات شخصی و متن آزاد ردشده)`,
    unmatchedLines,
  ].join('\n')
}

/**
 * @deprecated Kept only for the settings component (owned by another agent).
 * The generated report is redacted and user-reviewed; it is not "anonymous"
 * free text, so prefer `buildRedactedBetaMarkdownReport` in new code.
 */
export function buildAnonymousBetaMarkdownReport(summary: ComputedBetaSummary): string {
  return buildRedactedBetaMarkdownReport(summary)
}
