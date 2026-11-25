import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '../hooks/useFocusTrap'
import {
  buildJalaliMonthCalendar,
  JALALI_WEEKDAY_HEADERS,
  shiftJalaliMonth,
} from '../utils/jalaliCalendar'

interface JalaliCalendarPopoverProps {
  open: boolean
  selectedDateKey: string
  todayKey: string
  loggedDateKeys: ReadonlySet<string>
  onSelectDate: (dateKey: string) => void
  onClose: () => void
}

/**
 * Accessible Shamsi (Jalali) Monthly Calendar Picker modal/popover.
 * Shows emerald indicator dots under days with logged meals.
 */
export function JalaliCalendarPopover({
  open,
  selectedDateKey,
  todayKey,
  loggedDateKeys,
  onSelectDate,
  onClose,
}: JalaliCalendarPopoverProps) {
  const [prevSelected, setPrevSelected] = useState(selectedDateKey)
  const [viewAnchorKey, setViewAnchorKey] = useState(selectedDateKey)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  if (prevSelected !== selectedDateKey) {
    setPrevSelected(selectedDateKey)
    setViewAnchorKey(selectedDateKey)
  }

  useFocusTrap(dialogRef, open, onClose)

  const monthGrid = useMemo(
    () => buildJalaliMonthCalendar(viewAnchorKey, todayKey, loggedDateKeys),
    [viewAnchorKey, todayKey, loggedDateKeys],
  )

  if (!open) return null

  const canGoNextMonth = monthGrid.lastDayDateKey < todayKey

  return createPortal(
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="تقویم شمسی انتخاب روز"
      data-testid="jalali-calendar-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-xs rounded-2xl bg-[#161618] border border-[#2C2C33] p-4 shadow-2xl space-y-3 animate-fade-up"
      >
        {/* Month Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="ماه قبل"
              onClick={() => setViewAnchorKey((k) => shiftJalaliMonth(k, -1))}
              className="w-8 h-8 rounded-lg bg-[#1E1E22] hover:bg-[#282830] text-zinc-300 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="ماه بعد"
              disabled={!canGoNextMonth}
              onClick={() => setViewAnchorKey((k) => shiftJalaliMonth(k, 1))}
              className="w-8 h-8 rounded-lg bg-[#1E1E22] hover:bg-[#282830] disabled:opacity-30 text-zinc-300 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm font-bold text-zinc-100 tabular-nums-fa">
            {monthGrid.title}
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="بستن تقویم"
            className="w-8 h-8 rounded-lg bg-[#1E1E22] hover:bg-[#282830] text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday Headers (Saturday -> Friday) */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-400 font-medium">
          {JALALI_WEEKDAY_HEADERS.map((wd) => (
            <div key={wd} className="py-1">
              {wd}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center tabular-nums-fa">
          {Array.from({ length: monthGrid.leadingEmptyCells }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-9" />
          ))}

          {monthGrid.days.map((day) => {
            const isSelected = day.dateKey === selectedDateKey
            return (
              <button
                key={day.dateKey}
                type="button"
                disabled={day.isFuture}
                data-testid={`jalali-day-${day.dateKey}`}
                onClick={() => {
                  onSelectDate(day.dateKey)
                  onClose()
                }}
                className={`relative h-9 rounded-xl text-xs font-medium flex flex-col items-center justify-center transition-colors disabled:opacity-25 disabled:pointer-events-none ${
                  isSelected
                    ? 'bg-emerald-500 text-[#051B11] font-bold'
                    : day.isToday
                      ? 'bg-emerald-500/14 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'hover:bg-[#22222A] text-zinc-200'
                }`}
              >
                <span>{day.jalaliDayFa}</span>
                {day.hasEntries && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isSelected ? 'bg-[#051B11]' : 'bg-emerald-400'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Footer Quick Jump to Today */}
        <div className="flex items-center justify-between pt-2 border-t border-[#24242B] text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>روزهای دارای ثبت وعده</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onSelectDate(todayKey)
              onClose()
            }}
            className="text-emerald-400 hover:underline font-semibold"
          >
            امروز
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
