import type { MealType } from '../types/nutrition'

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

// Cached Intl formatters (avoids expensive V8 Intl instantiation inside render/CSV loops)
const NUMBER_FORMATTER_CACHE = new Map<number, Intl.NumberFormat | null>()
const JALALI_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>()
let TIME_FORMATTER: Intl.DateTimeFormat | null | undefined

function getNumberFormatter(maximumFractionDigits: number): Intl.NumberFormat | null {
  if (NUMBER_FORMATTER_CACHE.has(maximumFractionDigits)) {
    return NUMBER_FORMATTER_CACHE.get(maximumFractionDigits) ?? null
  }
  try {
    const fmt = new Intl.NumberFormat('fa-IR', { maximumFractionDigits })
    NUMBER_FORMATTER_CACHE.set(maximumFractionDigits, fmt)
    return fmt
  } catch {
    NUMBER_FORMATTER_CACHE.set(maximumFractionDigits, null)
    return null
  }
}

const JALALI_STYLE_OPTIONS: Record<
  'full' | 'medium' | 'short' | 'weekday',
  Intl.DateTimeFormatOptions
> = {
  full: {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
  medium: {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  },
  short: {
    day: 'numeric',
    month: 'short',
  },
  weekday: {
    weekday: 'short',
  },
}

function getJalaliFormatter(
  style: 'full' | 'medium' | 'short' | 'weekday',
): Intl.DateTimeFormat {
  const cached = JALALI_FORMATTER_CACHE.get(style)
  if (cached) return cached
  try {
    const fmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', JALALI_STYLE_OPTIONS[style])
    JALALI_FORMATTER_CACHE.set(style, fmt)
    return fmt
  } catch {
    const fallback = new Intl.DateTimeFormat('fa-IR', JALALI_STYLE_OPTIONS[style])
    JALALI_FORMATTER_CACHE.set(style, fallback)
    return fallback
  }
}

function getTimeFormatter(): Intl.DateTimeFormat | null {
  if (TIME_FORMATTER !== undefined) return TIME_FORMATTER
  try {
    TIME_FORMATTER = new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    TIME_FORMATTER = null
  }
  return TIME_FORMATTER
}

/** Converts ASCII (0-9) and Arabic-Indic (٠-٩) digits to Persian numerals (۰-۹). */
export function toPersianDigits(value: number | string): string {
  return String(value)
    .replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)])
    .replace(/[٠-٩]/g, (d) => PERSIAN_DIGITS[d.charCodeAt(0) - 0x0660])
}

/** Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII (0-9). */
export function toAsciiDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
}

/** Formats an integer or decimal with Persian digits and Persian grouping/decimal separators. */
export function formatFaNumber(value: number, maximumFractionDigits = 0): string {
  if (!Number.isFinite(value)) return '۰'
  const rounded =
    maximumFractionDigits === 0
      ? Math.round(value)
      : Math.round(value * 10 ** maximumFractionDigits) / 10 ** maximumFractionDigits
  const formatter = getNumberFormatter(maximumFractionDigits)
  if (formatter) {
    return formatter.format(rounded)
  }
  return toPersianDigits(rounded).replace('.', '٫')
}

/** Formats quantity nicely in Persian (e.g. 0.5 -> '۰٫۵', 1.5 -> '۱٫۵', 2 -> '۲'). */
export function formatQuantityFa(quantity: number): string {
  const clean = Math.round(quantity * 100) / 100
  if (Math.abs(clean - Math.round(clean)) < 0.001) {
    return formatFaNumber(Math.round(clean), 0)
  }
  return toPersianDigits(String(clean)).replace('.', '٫')
}

/** Returns local calendar date key in YYYY-MM-DD format. */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parses a local YYYY-MM-DD key back into a Date at local noon (avoids DST edges). */
export function dateFromKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0)
}

/** Shifts a YYYY-MM-DD key by deltaDays (e.g., -1 for yesterday). */
export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const d = dateFromKey(dateKey)
  d.setDate(d.getDate() + deltaDays)
  return getLocalDateKey(d)
}

const COMPACT_WEEKDAY_MAP: Record<number, string> = {
  6: 'شنبه',
  0: '۱ش',
  1: '۲ش',
  2: '۳ش',
  3: '۴ش',
  4: '۵ش',
  5: 'جمعه',
}

/** Formats a Date in the Iranian Jalali (Shamsi) calendar using cached Intl.DateTimeFormat('fa-IR'). */
export function formatJalaliDate(
  date: Date,
  style: 'full' | 'medium' | 'short' | 'weekday' | 'weekdayCompact' = 'full',
): string {
  if (style === 'weekdayCompact') {
    return COMPACT_WEEKDAY_MAP[date.getDay()] ?? ''
  }

  const formatter = getJalaliFormatter(style)
  if (style === 'full' || style === 'medium') {
    const parts = formatter.formatToParts(date)
    let weekday = ''
    let day = ''
    let month = ''
    let year = ''
    for (const p of parts) {
      if (p.type === 'weekday') weekday = p.value
      else if (p.type === 'day') day = p.value
      else if (p.type === 'month') month = p.value
      else if (p.type === 'year') year = p.value
    }
    if (style === 'full' && weekday && day && month && year) {
      return `${weekday}، ${day} ${month} ${year}`
    }
    if (style === 'medium' && weekday && day && month) {
      return `${weekday}، ${day} ${month}`
    }
  }
  return formatter.format(date)
}

export interface DaySlot {
  dateKey: string
  date: Date
  weekdayLabel: string
  weekdayCompact: string
  jalaliShort: string
  jalaliFull: string
  isToday: boolean
}

/** Returns the last N days (default 7), ending with referenceDate (chronological oldest -> newest). */
export function getLastNDays(count = 7, referenceDate: Date = new Date()): DaySlot[] {
  const todayKey = getLocalDateKey(referenceDate)
  const slots: DaySlot[] = []
  for (let offset = count - 1; offset >= 0; offset--) {
    const d = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - offset,
      12,
      0,
      0,
    )
    const dateKey = getLocalDateKey(d)
    slots.push({
      dateKey,
      date: d,
      weekdayLabel: formatJalaliDate(d, 'weekday'),
      weekdayCompact: formatJalaliDate(d, 'weekdayCompact'),
      jalaliShort: formatJalaliDate(d, 'short'),
      jalaliFull: formatJalaliDate(d, 'full'),
      isToday: dateKey === todayKey,
    })
  }
  return slots
}

/** Suggests the most likely meal type based on current local hour. */
export function getDefaultMealTypeForHour(hour: number = new Date().getHours()): MealType {
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 16) return 'lunch'
  if (hour >= 19 || hour < 5) return 'dinner'
  return 'snack'
}

/** Formats time as HH:MM in Persian digits using cached Intl formatter. */
export function formatTimeFa(timestamp: number): string {
  const d = new Date(timestamp)
  const fmt = getTimeFormatter()
  if (fmt) {
    return fmt.format(d)
  }
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return toPersianDigits(`${hh}:${mm}`)
}
