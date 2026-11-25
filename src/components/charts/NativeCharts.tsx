import { useId, useState } from 'react'
import type { EvaluatedMicronutrientItem, MacroEnergySplit } from '../../utils/micronutrients'
import { formatFaNumber } from '../../utils/persianFormat'

export interface CalorieBarPoint {
  dateKey: string
  axisLabel: string
  jalaliShort: string
  jalaliFull: string
  isToday: boolean
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

interface CalorieBarChartProps {
  data: CalorieBarPoint[]
  goalKcal: number
  maxAxisKcal: number
  rangeDays: 7 | 30
  onSelectDate?: (dateKey: string) => void
}

/**
 * Lightweight, dependency-free responsive SVG Calorie Bar Chart.
 * Uses CSS design tokens (`--chart-label`) so both Dark & Light themes maintain WCAG AA contrast.
 */
export function CalorieBarChart({
  data,
  goalKcal,
  maxAxisKcal,
  rangeDays,
  onSelectDate,
}: CalorieBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const W = 640
  const H = 240
  const padLeft = 48
  const padRight = 14
  const padTop = 18
  const padBottom = 32
  const plotW = W - padLeft - padRight
  const plotH = H - padTop - padBottom

  const safeMax = Math.max(maxAxisKcal, goalKcal, 500)
  const yTicks = [0, Math.round(safeMax / 2), safeMax]
  const yFor = (val: number) => padTop + plotH - Math.min(1, Math.max(0, val / safeMax)) * plotH
  const goalY = yFor(goalKcal)

  const count = Math.max(1, data.length)
  const slotW = plotW / count
  const barW = rangeDays === 7 ? Math.min(36, slotW * 0.56) : Math.min(13, slotW * 0.68)

  const activePoint = activeIndex !== null ? data[activeIndex] ?? null : null
  const activeDiff = activePoint ? activePoint.kcal - goalKcal : 0

  return (
    <div
      dir="ltr"
      className="relative w-full h-64 sm:h-72 select-none"
      data-testid="weekly-bar-chart"
      onMouseLeave={() => setActiveIndex(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full overflow-visible"
        role="img"
        aria-label="نمودار میله‌ای روند کالری"
      >
        <title>نمودار میله‌ای روند کالری</title>
        <desc>نمودار قابل دسترس برای صفحهخوان؛ مقادیر در متن خلاصهٔ وعدهها موجود است.</desc>
        {yTicks.map((tick) => {
          const y = yFor(tick)
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={W - padRight}
                y1={y}
                y2={y}
                stroke="var(--chart-grid)"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--chart-label)"
                fontSize="11"
                fontFamily="Vazirmatn Variable, sans-serif"
              >
                {formatFaNumber(tick)}
              </text>
            </g>
          )
        })}

        <line
          x1={padLeft}
          x2={W - padRight}
          y1={goalY}
          y2={goalY}
          stroke="#F59E0B"
          strokeDasharray="5 5"
          strokeWidth="1.5"
        />

        {data.map((entry, idx) => {
          const cx = padLeft + idx * slotW + slotW / 2
          const barH =
            entry.kcal > 0 ? Math.max(6, (Math.min(entry.kcal, safeMax) / safeMax) * plotH) : 4
          const y = padTop + plotH - barH
          const isOver = entry.kcal > goalKcal

          let fill = 'var(--chart-empty-bar)'
          if (entry.kcal > 0) {
            fill = isOver
              ? entry.isToday
                ? '#FBBF24'
                : '#D97706'
              : entry.isToday
                ? '#10B981'
                : '#059669'
          }

          const showLabel = rangeDays === 7 || idx % 5 === 0 || idx === count - 1
          const isHovered = activeIndex === idx

          return (
            <g
              key={entry.dateKey}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`انتخاب تاریخ ${entry.dateKey}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onFocus={() => setActiveIndex(idx)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActiveIndex(idx)
                  onSelectDate?.(entry.dateKey)
                }
              }}
              onClick={() => {
                setActiveIndex(idx)
                onSelectDate?.(entry.dateKey)
              }}
            >
              <rect
                x={padLeft + idx * slotW}
                y={padTop}
                width={slotW}
                height={plotH}
                fill={isHovered ? 'rgba(16, 185, 129, 0.08)' : 'transparent'}
                rx="6"
              />
              <rect
                x={cx - barW / 2}
                y={y}
                width={barW}
                height={barH}
                rx={rangeDays === 7 ? 6 : 3}
                fill={fill}
              />
              {showLabel && (
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fill={entry.isToday ? '#10B981' : 'var(--chart-label)'}
                  fontSize="11"
                  fontWeight={entry.isToday ? '700' : '400'}
                  fontFamily="Vazirmatn Variable, sans-serif"
                >
                  {entry.axisLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {activePoint && (
        <div
          dir="rtl"
          className="pointer-events-none absolute top-2 right-3 z-10 rounded-xl bg-[var(--bg-surface)]/95 backdrop-blur border border-[var(--border-elevated)] px-3 py-2 shadow-xl text-xs"
        >
          <div className="font-semibold text-zinc-100 mb-0.5">
            {activePoint.isToday
              ? `امروز (${activePoint.jalaliShort})`
              : activePoint.jalaliFull}
          </div>
          <div className="flex items-center justify-between gap-3 tabular-nums-fa">
            <span className="text-zinc-400">کالری تقریبی:</span>
            <span
              className={`font-bold ${
                activePoint.kcal > goalKcal ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {formatFaNumber(activePoint.kcal)} کالری
            </span>
          </div>
          {activePoint.kcal > 0 && (
            <div className="mt-1 pt-1 border-t border-[#26262C] flex items-center gap-2 text-[11px] tabular-nums-fa">
              <span className="text-sky-400">پ: {formatFaNumber(activePoint.protein, 1)}گ</span>
              <span className="text-amber-400">ک: {formatFaNumber(activePoint.carbs, 1)}گ</span>
              <span className="text-rose-400">چ: {formatFaNumber(activePoint.fat, 1)}گ</span>
              {(activePoint.fiber ?? 0) > 0 && (
                <span className="text-lime-400">
                  ف: {formatFaNumber(activePoint.fiber ?? 0, 1)}گ
                </span>
              )}
            </div>
          )}
          <div className="mt-0.5 text-[10px] text-zinc-400 tabular-nums-fa">
            {activePoint.kcal === 0
              ? 'بدون ثبت در این روز'
              : activeDiff > 0
                ? `${formatFaNumber(activeDiff)} کالری بالاتر از محدوده هدف`
                : `${formatFaNumber(Math.abs(activeDiff))} کالری کمتر از سقف هدف`}
          </div>
        </div>
      )}
    </div>
  )
}

export interface WeightLinePoint {
  dateKey: string
  weightKg: number
  jalaliShort: string
  jalaliFull: string
}

interface WeightLineChartProps {
  points: WeightLinePoint[]
  targetWeightKg?: number
}

/**
 * SVG Weight Trend Chart with daily points, smoothed 7-point Moving Average curve
 * (to filter out daily water-weight noise), and optional Target Weight reference line.
 */
export function WeightLineChart({ points, targetWeightKg }: WeightLineChartProps) {
  const gradId = useId()
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  if (points.length < 2) return null

  const W = 640
  const H = 185
  const padLeft = 46
  const padRight = 16
  const padTop = 18
  const padBottom = 30
  const plotW = W - padLeft - padRight
  const plotH = H - padTop - padBottom

  const movingAvgValues = points.map((_, idx) => {
    const start = Math.max(0, idx - 6)
    const win = points.slice(start, idx + 1)
    const sum = win.reduce((s, p) => s + p.weightKg, 0)
    return Math.round((sum / win.length) * 10) / 10
  })

  const allValues = [
    ...points.map((p) => p.weightKg),
    ...(targetWeightKg && targetWeightKg >= 30 ? [targetWeightKg] : []),
  ]
  const minW = Math.floor(Math.min(...allValues) - 1)
  const maxW = Math.ceil(Math.max(...allValues) + 1)
  const span = Math.max(2, maxW - minW)

  const xFor = (idx: number) => padLeft + (idx / (points.length - 1)) * plotW
  const yFor = (val: number) => padTop + plotH - ((val - minW) / span) * plotH

  const coords = points.map((p, i) => ({
    x: xFor(i),
    y: yFor(p.weightKg),
    maY: yFor(movingAvgValues[i]),
    maVal: movingAvgValues[i],
    pt: p,
  }))

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ')
  const maPath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.maY.toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${padTop + plotH} L ${coords[0].x.toFixed(1)} ${padTop + plotH} Z`

  const yTicks = [minW, Math.round(((minW + maxW) / 2) * 10) / 10, maxW]
  const activeCoord = activeIdx !== null ? coords[activeIdx] ?? null : null
  const targetY =
    targetWeightKg && targetWeightKg >= 30 ? yFor(targetWeightKg) : null

  return (
    <div className="space-y-2">
      <div
        dir="ltr"
        className="relative w-full h-48 select-none"
        data-testid="weight-progress-chart"
        onMouseLeave={() => setActiveIdx(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full overflow-visible"
          role="img"
          aria-label="نمودار خطی روند وزن و میانگین متحرک ۷ روزه"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => {
            const y = yFor(tick)
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  x2={W - padRight}
                  y1={y}
                  y2={y}
                  stroke="var(--chart-grid)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--chart-label)"
                  fontSize="11"
                  fontFamily="Vazirmatn Variable, sans-serif"
                >
                  {formatFaNumber(tick, 1)}
                </text>
              </g>
            )
          })}

          {/* Optional Target Body Weight Reference Line */}
          {targetY !== null && (
            <line
              x1={padLeft}
              x2={W - padRight}
              y1={targetY}
              y2={targetY}
              stroke="#F59E0B"
              strokeDasharray="5 4"
              strokeWidth="1.5"
            />
          )}

          <path d={areaPath} fill={`url(#${gradId})`} />
          {/* Daily Weight Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeOpacity="0.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Smoothed 7-Point Moving Average Trendline */}
          <path
            d={maPath}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
            strokeDasharray="6 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {coords.map((c, idx) => {
            const showTick =
              points.length <= 7 || idx === 0 || idx === points.length - 1 || idx % 4 === 0
            return (
              <g
                key={c.pt.dateKey}
                className="cursor-pointer"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => setActiveIdx(idx)}
              >
                <circle cx={c.x} cy={c.y} r={12} fill="transparent" />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={activeIdx === idx ? 6 : 3.8}
                  fill={activeIdx === idx ? '#7DD3FC' : '#38BDF8'}
                />
                {showTick && (
                  <text
                    x={c.x}
                    y={H - 6}
                    textAnchor="middle"
                    fill="var(--chart-label)"
                    fontSize="10.5"
                    fontFamily="Vazirmatn Variable, sans-serif"
                  >
                    {c.pt.jalaliShort}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {activeCoord && (
          <div
            dir="rtl"
            className="pointer-events-none absolute top-2 right-3 rounded-xl bg-[var(--bg-surface)]/95 border border-[var(--border-elevated)] px-3 py-1.5 shadow-xl text-xs tabular-nums-fa space-y-0.5"
          >
            <div className="text-zinc-400 text-[11px]">{activeCoord.pt.jalaliFull}</div>
            <div className="text-sky-400 font-bold">
              وزن ثبت‌شده: {formatFaNumber(activeCoord.pt.weightKg, 1)} ک‌گ
            </div>
            <div className="text-emerald-400 text-[11px]">
              میانگین متحرک: {formatFaNumber(activeCoord.maVal, 1)} ک‌گ
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-400 px-1 tabular-nums-fa">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> وزن روزانه
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-emerald-400 inline-block" /> میانگین متحرک ۷ نوبت (بدون نوسان
          آب)
        </span>
        {targetWeightKg && targetWeightKg >= 30 && (
          <span className="inline-flex items-center gap-1.5 text-amber-300">
            <span className="w-4 h-0.5 bg-amber-400 inline-block" /> وزن هدف:{' '}
            {formatFaNumber(targetWeightKg, 1)} ک‌گ
          </span>
        )}
      </div>
    </div>
  )
}

interface MacroDonutChartProps {
  split: MacroEnergySplit
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams?: number
  fiberGoalGrams?: number
  compact?: boolean
}

export function MacroDonutChart({
  split,
  proteinGrams,
  carbsGrams,
  fatGrams,
  fiberGrams = 0,
  fiberGoalGrams = 28,
  compact = false,
}: MacroDonutChartProps) {
  const [selectedId, setSelectedId] = useState<'protein' | 'carbs' | 'fat' | null>(null)

  const size = compact ? 156 : 176
  const strokeWidth = compact ? 16 : 18
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const segments = [
    {
      id: 'protein' as const,
      label: 'پروتئین',
      grams: proteinGrams,
      kcal: split.proteinKcal,
      pct: split.proteinPct,
      goalPct: split.goalProteinPct,
      color: '#38BDF8',
      textClass: 'text-sky-400',
      dotClass: 'bg-sky-400',
    },
    {
      id: 'carbs' as const,
      label: 'کربوهیدرات',
      grams: carbsGrams,
      kcal: split.carbsKcal,
      pct: split.carbsPct,
      goalPct: split.goalCarbsPct,
      color: '#FBBF24',
      textClass: 'text-amber-400',
      dotClass: 'bg-amber-400',
    },
    {
      id: 'fat' as const,
      label: 'چربی',
      grams: fatGrams,
      kcal: split.fatKcal,
      pct: split.fatPct,
      goalPct: split.goalFatPct,
      color: '#FB7185',
      textClass: 'text-rose-400',
      dotClass: 'bg-rose-400',
    },
  ]

  let cumulativeFraction = 0
  const arcSpecs = segments.map((seg) => {
    const fraction = split.totalMacroKcal > 0 ? seg.kcal / split.totalMacroKcal : 0
    const arcLen = Math.max(0, fraction * circumference)
    const offset = -cumulativeFraction * circumference
    cumulativeFraction += fraction
    return { ...seg, arcLen, offset }
  })

  const activeSeg = selectedId ? segments.find((s) => s.id === selectedId) ?? null : null

  return (
    <div
      data-testid="macro-donut-chart"
      className={`flex flex-col ${compact ? 'items-center gap-3.5' : 'sm:flex-row items-center gap-5'}`}
    >
      <div
        className="relative flex items-center justify-center shrink-0 select-none"
        onMouseLeave={() => setSelectedId(null)}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label="نمودار حلقه‌ای سهم انرژی درشت‌مغذی‌ها"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--ring-track)"
            strokeWidth={strokeWidth}
          />
          {split.hasMacroEnergy &&
            arcSpecs.map((arc) => {
              if (arc.arcLen <= 0.5) return null
              const isDimmed = selectedId !== null && selectedId !== arc.id
              return (
                <circle
                  key={arc.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={selectedId === arc.id ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${arc.arcLen} ${circumference}`}
                  strokeDashoffset={arc.offset}
                  opacity={isDimmed ? 0.35 : 1}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setSelectedId(arc.id)}
                  onClick={() => setSelectedId((prev) => (prev === arc.id ? null : arc.id))}
                />
              )
            })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pointer-events-none tabular-nums-fa">
          {activeSeg ? (
            <>
              <span className={`text-xs font-bold ${activeSeg.textClass}`}>{activeSeg.label}</span>
              <span className="text-2xl font-extrabold text-zinc-50 leading-tight mt-0.5">
                {formatFaNumber(activeSeg.pct)}٪
              </span>
              <span className="text-[10px] text-zinc-400">
                {formatFaNumber(activeSeg.kcal)} کالری ({formatFaNumber(activeSeg.grams, 1)}گ)
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-zinc-400">انرژی درشت‌مغذی</span>
              <span className="text-xl font-extrabold text-zinc-50 leading-tight mt-0.5">
                {formatFaNumber(split.totalMacroKcal)}
              </span>
              <span className="text-[10px] text-zinc-400">کالری مجموع</span>
            </>
          )}
        </div>
      </div>

      <div className="w-full flex-1 space-y-2">
        {segments.map((seg) => {
          const active = selectedId === seg.id
          return (
            <button
              key={seg.id}
              type="button"
              onMouseEnter={() => setSelectedId(seg.id)}
              onClick={() => setSelectedId((prev) => (prev === seg.id ? null : seg.id))}
              className={`w-full rounded-xl px-3 py-2 border text-right transition-colors flex items-center justify-between gap-2 text-xs tabular-nums-fa ${
                active
                  ? 'bg-[#22222A] border-emerald-500/40'
                  : 'bg-[#1A1A1E] hover:bg-[#222228] border-[#282830]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.dotClass}`} />
                <span className="font-semibold text-zinc-100">{seg.label}</span>
                <span className="text-[11px] text-zinc-400">
                  ({formatFaNumber(seg.grams, 1)} گرم)
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`font-bold ${seg.textClass}`}>{formatFaNumber(seg.pct)}٪</span>
                <span className="text-[10px] text-zinc-400">
                  هدف {formatFaNumber(seg.goalPct)}٪
                </span>
              </div>
            </button>
          )
        })}

        <div className="rounded-xl px-3 py-2 bg-[#161A14] border border-lime-500/25 flex items-center justify-between text-xs tabular-nums-fa">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-lime-400 shrink-0" />
            <span className="font-semibold text-zinc-200">فیبر غذایی</span>
          </div>
          <div className="text-lime-400 font-semibold">
            {formatFaNumber(fiberGrams, 1)}{' '}
            <span className="text-zinc-400 font-normal">
              / {formatFaNumber(fiberGoalGrams)} گرم
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MacroStackedBarChartProps {
  data: CalorieBarPoint[]
  rangeDays: 7 | 30
  onSelectDate?: (dateKey: string) => void
}

export function MacroStackedBarChart({
  data,
  rangeDays,
  onSelectDate,
}: MacroStackedBarChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  const W = 640
  const H = 200
  const padLeft = 44
  const padRight = 12
  const padTop = 14
  const padBottom = 30
  const plotW = W - padLeft - padRight
  const plotH = H - padTop - padBottom

  const dayTotals = data.map((d) => ({
    ...d,
    protKcal: Math.max(0, d.protein * 4),
    carbKcal: Math.max(0, d.carbs * 4),
    fatKcal: Math.max(0, d.fat * 9),
  }))

  const maxMacroKcal = Math.max(
    1200,
    ...dayTotals.map((d) => (d.protKcal + d.carbKcal + d.fatKcal) * 1.12),
  )
  const safeMax = Math.ceil(maxMacroKcal / 250) * 250
  const count = Math.max(1, dayTotals.length)
  const slotW = plotW / count
  const barW = rangeDays === 7 ? Math.min(34, slotW * 0.55) : Math.min(12, slotW * 0.68)

  const activeDay = activeIdx !== null ? dayTotals[activeIdx] ?? null : null
  const activeSum = activeDay ? activeDay.protKcal + activeDay.carbKcal + activeDay.fatKcal : 0

  return (
    <div
      dir="ltr"
      data-testid="macro-stacked-bar-chart"
      className="relative w-full h-52 select-none"
      onMouseLeave={() => setActiveIdx(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full overflow-visible"
        role="img"
        aria-label="نمودار انباشته روزانه درشت‌مغذی‌ها"
      >
        <title>نمودار انباشته روزانه درشت‌مغذی‌ها</title>
        <desc>نمودار قابل دسترس برای صفحهخوان؛ مقادیر در متن خلاصهٔ وعدهها موجود است.</desc>
        {[0, Math.round(safeMax / 2), safeMax].map((tick) => {
          const y = padTop + plotH - (tick / safeMax) * plotH
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={W - padRight}
                y1={y}
                y2={y}
                stroke="var(--chart-grid)"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 6}
                y={y + 4}
                textAnchor="end"
                fill="var(--chart-label)"
                fontSize="10.5"
                fontFamily="Vazirmatn Variable, sans-serif"
              >
                {formatFaNumber(tick)}
              </text>
            </g>
          )
        })}

        {dayTotals.map((d, idx) => {
          const cx = padLeft + idx * slotW + slotW / 2
          const sum = d.protKcal + d.carbKcal + d.fatKcal
          const totalH = sum > 0 ? Math.min(plotH, (sum / safeMax) * plotH) : 0
          const protH = sum > 0 ? (d.protKcal / sum) * totalH : 0
          const carbH = sum > 0 ? (d.carbKcal / sum) * totalH : 0
          const fatH = Math.max(0, totalH - protH - carbH)

          const baseBottom = padTop + plotH
          const showLabel = rangeDays === 7 || idx % 5 === 0 || idx === count - 1

          return (
            <g
              key={d.dateKey}
              className="cursor-pointer"
              onMouseEnter={() => setActiveIdx(idx)}
              onClick={() => {
                setActiveIdx(idx)
                onSelectDate?.(d.dateKey)
              }}
            >
              <rect
                x={padLeft + idx * slotW}
                y={padTop}
                width={slotW}
                height={plotH}
                fill={activeIdx === idx ? 'rgba(56, 189, 248, 0.08)' : 'transparent'}
                rx="5"
              />
              {sum <= 0 ? (
                <rect
                  x={cx - barW / 2}
                  y={baseBottom - 4}
                  width={barW}
                  height={4}
                  rx={2}
                  fill="var(--chart-empty-bar)"
                />
              ) : (
                <>
                  <rect
                    x={cx - barW / 2}
                    y={baseBottom - protH}
                    width={barW}
                    height={protH}
                    fill="#38BDF8"
                  />
                  <rect
                    x={cx - barW / 2}
                    y={baseBottom - protH - carbH}
                    width={barW}
                    height={carbH}
                    fill="#FBBF24"
                  />
                  <rect
                    x={cx - barW / 2}
                    y={baseBottom - protH - carbH - fatH}
                    width={barW}
                    height={fatH}
                    rx={rangeDays === 7 ? 4 : 2}
                    fill="#FB7185"
                  />
                </>
              )}
              {showLabel && (
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fill={d.isToday ? '#10B981' : 'var(--chart-label)'}
                  fontSize="10.5"
                  fontWeight={d.isToday ? '700' : '400'}
                  fontFamily="Vazirmatn Variable, sans-serif"
                >
                  {d.axisLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {activeDay && activeSum > 0 && (
        <div
          dir="rtl"
          className="pointer-events-none absolute top-2 right-3 z-10 rounded-xl bg-[var(--bg-surface)]/95 border border-[var(--border-elevated)] px-3 py-2 shadow-xl text-[11px] tabular-nums-fa"
        >
          <div className="font-semibold text-zinc-100 mb-1">{activeDay.jalaliFull}</div>
          <div className="flex items-center gap-2.5">
            <span className="text-sky-400">
              پ: {formatFaNumber(activeDay.protein, 1)}گ (
              {formatFaNumber(Math.round((activeDay.protKcal / activeSum) * 100))}٪)
            </span>
            <span className="text-amber-400">
              ک: {formatFaNumber(activeDay.carbs, 1)}گ (
              {formatFaNumber(Math.round((activeDay.carbKcal / activeSum) * 100))}٪)
            </span>
            <span className="text-rose-400">
              چ: {formatFaNumber(activeDay.fat, 1)}گ (
              {formatFaNumber(Math.round((activeDay.fatKcal / activeSum) * 100))}٪)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

interface MicronutrientRadarChartProps {
  items: readonly EvaluatedMicronutrientItem[]
  selectedKey?: string | null
  onSelectKey?: (key: string) => void
}

export function MicronutrientRadarChart({
  items,
  selectedKey,
  onSelectKey,
}: MicronutrientRadarChartProps) {
  const radarItems = items.filter((item) => !item.spec.isUpperLimit)
  const n = radarItems.length
  if (n < 3) return null

  const size = 250
  const cx = size / 2
  const cy = size / 2
  const maxR = 80
  const labelR = 104

  const angleFor = (idx: number) => -Math.PI / 2 + (idx * 2 * Math.PI) / n
  const pointAt = (idx: number, pct0to100: number) => {
    const r = (Math.min(100, Math.max(0, pct0to100)) / 100) * maxR
    const ang = angleFor(idx)
    return {
      x: cx + r * Math.cos(ang),
      y: cy + r * Math.sin(ang),
    }
  }

  const rings = [25, 50, 75, 100]
  const dataPoints = radarItems.map((it, idx) => pointAt(idx, it.clampedPct))
  const polygonStr = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <div
      dir="ltr"
      data-testid="micronutrient-radar-chart"
      className="flex items-center justify-center select-none"
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[250px] h-auto overflow-visible"
        role="img"
        aria-label="نمودار راداری پوشش ویتامین‌ها و املاح معدنی"
      >
        <title>نمودار راداری پوشش ویتامین‌ها و املاح معدنی</title>
        <desc>نمودار قابل دسترس برای صفحهخوان؛ مقادیر در متن خلاصهٔ وعدهها موجود است.</desc>
        {rings.map((ringPct) => {
          const pts = radarItems
            .map((_, idx) => {
              const p = pointAt(idx, ringPct)
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
            })
            .join(' ')
          return (
            <polygon
              key={ringPct}
              points={pts}
              fill="none"
              stroke="var(--chart-grid)"
              strokeWidth={ringPct === 100 ? '1.3' : '0.9'}
              strokeDasharray={ringPct === 100 ? undefined : '2 2'}
            />
          )
        })}

        {radarItems.map((it, idx) => {
          const outer = pointAt(idx, 100)
          return (
            <line
              key={it.spec.key}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--chart-grid)"
              strokeWidth="0.9"
            />
          )
        })}

        <polygon
          points={polygonStr}
          fill="rgba(16, 185, 129, 0.22)"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {radarItems.map((it, idx) => {
          const pt = dataPoints[idx]
          const ang = angleFor(idx)
          const lx = cx + labelR * Math.cos(ang)
          const ly = cy + labelR * Math.sin(ang)
          const isSelected = selectedKey === it.spec.key

          return (
            <g
              key={it.spec.key}
              className="cursor-pointer"
              onClick={() => onSelectKey?.(it.spec.key)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? 5 : 3.5}
                fill={
                  it.status === 'good'
                    ? '#10B981'
                    : it.status === 'moderate'
                      ? '#F59E0B'
                      : 'var(--chart-label)'
                }
              />
              <text
                x={lx}
                y={ly + 3}
                textAnchor="middle"
                fill={isSelected ? '#10B981' : 'var(--chart-label-strong)'}
                fontSize="9.5"
                fontWeight={isSelected ? '700' : '500'}
                fontFamily="Vazirmatn Variable, sans-serif"
              >
                {it.spec.shortLabel}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
