import type { MacroValues, UserGoals } from '../types/nutrition'
import { formatFaNumber } from './persianFormat'

export interface DailyCardImageInput {
  appName: string
  dateLabel: string
  consumed: MacroValues
  goals: UserGoals
  waterGlasses: number
}

export interface WeeklyCardImageInput {
  appName: string
  periodLabel: string
  avgKcal: number
  goalKcal: number
  activeDaysCount: number
  avgProtein: number
  avgCarbs: number
  avgFat: number
  days: Array<{ label: string; kcal: number }>
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.closePath()
}

async function shareOrDownloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  title: string,
): Promise<'shared' | 'downloaded' | 'failed'> {
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png'),
  )
  if (!blob) return 'failed'

  try {
    const file = new File([blob], filename, { type: 'image/png' })
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ title, files: [file] })
      return 'shared'
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'shared'
    }
    // Fall through to direct download
  }

  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}

/**
 * Renders and shares/downloads a high-craft 1080x1080 RTL Persian Daily Nutrition Card PNG
 * locally on-device using the self-hosted Vazirmatn Variable font.
 */
export async function exportDailySummaryImage(
  input: DailyCardImageInput,
  filename = 'kalorishomar-daily-card.png',
): Promise<'shared' | 'downloaded' | 'failed'> {
  if (typeof document === 'undefined') return 'failed'
  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const W = 1080
  const H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return 'failed'

  const font = '"Vazirmatn Variable", Tahoma, sans-serif'
  ctx.direction = 'rtl'

  // Background
  ctx.fillStyle = '#0C0C0D'
  ctx.fillRect(0, 0, W, H)

  // Outer card
  ctx.fillStyle = '#161618'
  ctx.strokeStyle = '#2A2A32'
  ctx.lineWidth = 3
  drawRoundedRect(ctx, 56, 56, W - 112, H - 112, 44)
  ctx.fill()
  ctx.stroke()

  // Header
  ctx.textAlign = 'right'
  ctx.fillStyle = '#10B981'
  ctx.font = `800 38px ${font}`
  ctx.fillText(input.appName, W - 110, 145)

  ctx.fillStyle = '#A1A1AA'
  ctx.font = `500 28px ${font}`
  ctx.fillText(input.dateLabel, W - 110, 195)

  // Center Calorie Ring
  const cx = W / 2
  const cy = 430
  const radius = 155
  ctx.lineWidth = 24
  ctx.strokeStyle = '#26262C'
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()

  const ratio = input.goals.dailyKcal > 0 ? Math.min(1, input.consumed.kcal / input.goals.dailyKcal) : 0
  const isOver = input.consumed.kcal > input.goals.dailyKcal
  ctx.strokeStyle = isOver ? '#F59E0B' : '#10B981'
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#FAFAFA'
  ctx.font = `800 76px ${font}`
  ctx.fillText(formatFaNumber(input.consumed.kcal), cx, cy + 12)

  ctx.fillStyle = '#A1A1AA'
  ctx.font = `500 26px ${font}`
  ctx.fillText(`از ${formatFaNumber(input.goals.dailyKcal)} کالری (تقریبی)`, cx, cy + 62)

  // Macro cards row
  const cards = [
    {
      label: 'پروتئین',
      val: `${formatFaNumber(input.consumed.protein, 1)} / ${formatFaNumber(input.goals.proteinGrams)} گ`,
      color: '#38BDF8',
    },
    {
      label: 'کربوهیدرات',
      val: `${formatFaNumber(input.consumed.carbs, 1)} / ${formatFaNumber(input.goals.carbsGrams)} گ`,
      color: '#FBBF24',
    },
    {
      label: 'چربی',
      val: `${formatFaNumber(input.consumed.fat, 1)} / ${formatFaNumber(input.goals.fatGrams)} گ`,
      color: '#FB7185',
    },
    {
      label: 'آب روزانه',
      val: `${formatFaNumber(input.waterGlasses)} / ${formatFaNumber(input.goals.waterGoalGlasses)} لیوان`,
      color: '#22D3EE',
    },
  ]

  const boxW = (W - 220 - 36) / 2
  const boxH = 128
  cards.forEach((c, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const x = col === 0 ? W - 110 - boxW : 110
    const y = 650 + row * (boxH + 24)

    ctx.fillStyle = '#1E1E24'
    drawRoundedRect(ctx, x, y, boxW, boxH, 24)
    ctx.fill()

    ctx.textAlign = 'right'
    ctx.fillStyle = '#A1A1AA'
    ctx.font = `500 24px ${font}`
    ctx.fillText(c.label, x + boxW - 28, y + 48)

    ctx.fillStyle = c.color
    ctx.font = `700 30px ${font}`
    ctx.fillText(c.val, x + boxW - 28, y + 96)
  })

  // Footer
  ctx.textAlign = 'center'
  ctx.fillStyle = '#71717A'
  ctx.font = `400 21px ${font}`
  ctx.fillText('کالری‌شمار روزمره — محاسبه محلی و بدون ردیابی (مقادیر تقریبی)', W / 2, H - 88)

  return shareOrDownloadCanvas(canvas, filename, `گزارش روزانه ${input.appName}`)
}

/**
 * Renders and shares/downloads a 1080x1080 RTL Persian 7-Day Weekly Report Card PNG.
 */
export async function exportWeeklySummaryImage(
  input: WeeklyCardImageInput,
  filename = 'kalorishomar-weekly-card.png',
): Promise<'shared' | 'downloaded' | 'failed'> {
  if (typeof document === 'undefined') return 'failed'
  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const W = 1080
  const H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return 'failed'

  const font = '"Vazirmatn Variable", Tahoma, sans-serif'
  ctx.direction = 'rtl'

  ctx.fillStyle = '#0C0C0D'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#161618'
  ctx.strokeStyle = '#2A2A32'
  ctx.lineWidth = 3
  drawRoundedRect(ctx, 56, 56, W - 112, H - 112, 44)
  ctx.fill()
  ctx.stroke()

  ctx.textAlign = 'right'
  ctx.fillStyle = '#10B981'
  ctx.font = `800 38px ${font}`
  ctx.fillText(`گزارش هفتگی ${input.appName}`, W - 110, 145)

  ctx.fillStyle = '#A1A1AA'
  ctx.font = `500 26px ${font}`
  ctx.fillText(input.periodLabel, W - 110, 192)

  // Summary strip
  ctx.fillStyle = '#1E1E24'
  drawRoundedRect(ctx, 110, 230, W - 220, 150, 28)
  ctx.fill()

  ctx.textAlign = 'right'
  ctx.fillStyle = '#FAFAFA'
  ctx.font = `800 44px ${font}`
  ctx.fillText(`میانگین: ~${formatFaNumber(input.avgKcal)} کالری`, W - 145, 298)

  ctx.fillStyle = '#A1A1AA'
  ctx.font = `500 25px ${font}`
  ctx.fillText(
    `${formatFaNumber(input.activeDaysCount)} روز فعال · هدف روزانه ${formatFaNumber(input.goalKcal)} · پ ${formatFaNumber(input.avgProtein, 1)}گ · ک ${formatFaNumber(input.avgCarbs, 1)}گ · چ ${formatFaNumber(input.avgFat, 1)}گ`,
    W - 145,
    348,
  )

  // 7-day bars (RTL right-to-left)
  const chartTop = 440
  const chartBottom = 830
  const chartHeight = chartBottom - chartTop
  const maxVal = Math.max(input.goalKcal * 1.15, ...input.days.map((d) => d.kcal), 1000)
  const slotW = (W - 220) / Math.max(1, input.days.length)

  // Goal dashed line
  const goalY = chartBottom - (input.goalKcal / maxVal) * chartHeight
  ctx.save()
  ctx.strokeStyle = '#F59E0B'
  ctx.lineWidth = 3
  ctx.setLineDash([10, 8])
  ctx.beginPath()
  ctx.moveTo(110, goalY)
  ctx.lineTo(W - 110, goalY)
  ctx.stroke()
  ctx.restore()

  input.days.forEach((day, idx) => {
    const centerX = W - 110 - slotW * idx - slotW / 2
    const barW = Math.min(64, slotW * 0.58)
    const barH = day.kcal > 0 ? Math.max(14, (day.kcal / maxVal) * chartHeight) : 8
    const barY = chartBottom - barH

    ctx.fillStyle =
      day.kcal === 0 ? '#27272E' : day.kcal > input.goalKcal ? '#F59E0B' : '#10B981'
    drawRoundedRect(ctx, centerX - barW / 2, barY, barW, barH, 12)
    ctx.fill()

    ctx.textAlign = 'center'
    ctx.fillStyle = '#A1A1AA'
    ctx.font = `500 22px ${font}`
    ctx.fillText(day.label, centerX, chartBottom + 42)

    if (day.kcal > 0) {
      ctx.fillStyle = '#E4E4E7'
      ctx.font = `700 20px ${font}`
      ctx.fillText(formatFaNumber(day.kcal), centerX, barY - 12)
    }
  })

  ctx.textAlign = 'center'
  ctx.fillStyle = '#71717A'
  ctx.font = `400 21px ${font}`
  ctx.fillText('کالری‌شمار روزمره — ابزار آموزشی با حفظ کامل حریم خصوصی', W / 2, H - 88)

  return shareOrDownloadCanvas(canvas, filename, `گزارش هفتگی ${input.appName}`)
}
