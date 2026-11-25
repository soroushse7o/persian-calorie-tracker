import { dateFromKey, formatFaNumber, getLocalDateKey, shiftDateKey, toAsciiDigits } from './persianFormat'

export interface JalaliDayCell {
  dateKey: string
  jalaliDay: number
  jalaliDayFa: string
  isToday: boolean
  isFuture: boolean
  hasEntries: boolean
}

export interface JalaliMonthGrid {
  title: string
  firstDayDateKey: string
  lastDayDateKey: string
  leadingEmptyCells: number
  days: JalaliDayCell[]
}

const JALALI_PARTS_FORMATTER = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

function extractJalaliParts(dateKey: string): { year: number; monthName: string; day: number } {
  const parts = JALALI_PARTS_FORMATTER.formatToParts(dateFromKey(dateKey))
  let year = 1405
  let monthName = ''
  let day = 1
  for (const p of parts) {
    if (p.type === 'year') year = Number(toAsciiDigits(p.value)) || 1405
    else if (p.type === 'month') monthName = p.value
    else if (p.type === 'day') day = Number(toAsciiDigits(p.value)) || 1
  }
  return { year, monthName, day }
}

/** Converts JS Date.getDay() (0=Sun..6=Sat) to Iranian week column index (0=Saturday..6=Friday). */
function toIranianWeekCol(dateKey: string): number {
  const jsDay = dateFromKey(dateKey).getDay()
  return (jsDay + 1) % 7
}

export const JALALI_WEEKDAY_HEADERS = ['ش', '۱ش', '۲ش', '۳ش', '۴ش', '۵ش', 'ج'] as const

/**
 * Builds a complete, dependency-free Jalali (Shamsi) monthly calendar grid around `anchorDateKey`
 * using native `Intl.DateTimeFormat('fa-IR-u-ca-persian')`.
 */
export function buildJalaliMonthCalendar(
  anchorDateKey: string,
  todayKey: string = getLocalDateKey(),
  loggedDateKeys: ReadonlySet<string> = new Set(),
): JalaliMonthGrid {
  const anchorParts = extractJalaliParts(anchorDateKey)

  // Step backward by (day - 1) to land on day 1 of the target Jalali month
  let firstDayKey = shiftDateKey(anchorDateKey, -(anchorParts.day - 1))
  while (extractJalaliParts(firstDayKey).day > 1) {
    firstDayKey = shiftDateKey(firstDayKey, -1)
  }

  const monthMeta = extractJalaliParts(firstDayKey)
  const leadingEmptyCells = toIranianWeekCol(firstDayKey)
  const days: JalaliDayCell[] = []

  let cursor = firstDayKey
  for (let safety = 0; safety < 32; safety++) {
    const p = extractJalaliParts(cursor)
    if (safety > 0 && p.day === 1) break
    days.push({
      dateKey: cursor,
      jalaliDay: p.day,
      jalaliDayFa: formatFaNumber(p.day),
      isToday: cursor === todayKey,
      isFuture: cursor > todayKey,
      hasEntries: loggedDateKeys.has(cursor),
    })
    cursor = shiftDateKey(cursor, 1)
  }

  const lastDayDateKey = days[days.length - 1]?.dateKey ?? firstDayKey

  return {
    title: `${monthMeta.monthName} ${formatFaNumber(monthMeta.year)}`,
    firstDayDateKey: firstDayKey,
    lastDayDateKey,
    leadingEmptyCells,
    days,
  }
}

/** Navigates cleanly to the previous or next Jalali month, returning the 1st day's YYYY-MM-DD key. */
export function shiftJalaliMonth(anchorDateKey: string, direction: -1 | 1): string {
  const grid = buildJalaliMonthCalendar(anchorDateKey)
  if (direction === -1) {
    const prevMonthLastDay = shiftDateKey(grid.firstDayDateKey, -1)
    return buildJalaliMonthCalendar(prevMonthLastDay).firstDayDateKey
  }
  return shiftDateKey(grid.lastDayDateKey, 1)
}
