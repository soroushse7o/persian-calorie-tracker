import {
  getMealTypeLabels,
  type FoodItem,
  type LoggedFoodEntry,
  type MealScheduleMode,
  type MealType,
} from '../types/nutrition'
import { resolveEntryMicronutrients } from './micronutrients'
import { dateFromKey, formatJalaliDate } from './persianFormat'

function escapeCsvCell(value: string | number): string {
  let str = String(value)
  // Neutralize spreadsheet formula injection characters (=, +, -, @)
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Generates an Excel-compatible UTF-8 BOM CSV file of all logged meal entries
 * with Jalali dates, schedule-aware Persian meal labels, household units, macros, fiber,
 * and key micronutrients (Iron, Calcium, Sodium, Vitamin C, Vitamin D).
 */
export function buildEntriesCsv(
  entries: LoggedFoodEntry[],
  foods: readonly FoodItem[] = [],
  scheduleMode: MealScheduleMode = 'standard',
  customLabels?: Partial<Record<MealType, string>>,
): string {
  const mealLabels = getMealTypeLabels(scheduleMode, customLabels)
  const foodById = new Map(foods.map((f) => [f.id, f]))

  const headers = [
    'تاریخ جلالی',
    'تاریخ میلادی',
    'وعده',
    'نام غذا',
    'مقدار',
    'واحد',
    'وزن (گرم)',
    'کالری',
    'پروتئین (گرم)',
    'کربوهیدرات (گرم)',
    'چربی (گرم)',
    'فیبر (گرم)',
    'آهن (mg)',
    'کلسیم (mg)',
    'سدیم (mg)',
    'ویتامین C (mg)',
    'ویتامین D (mcg)',
  ]

  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp)
  const rows = sorted.map((e) => {
    const micro = resolveEntryMicronutrients(e, foodById)
    return [
      formatJalaliDate(dateFromKey(e.dateKey), 'full'),
      e.dateKey,
      mealLabels[e.mealType],
      e.foodName,
      e.quantity,
      e.unit,
      e.totalGrams,
      e.kcal,
      e.protein,
      e.carbs,
      e.fat,
      e.fiber ?? 0,
      micro.ironMg,
      micro.calciumMg,
      micro.sodiumMg,
      micro.vitaminCMg,
      micro.vitaminDMcg,
    ]
  })

  const csvBody = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n')

  // UTF-8 BOM ensures Excel opens Persian text cleanly without encoding artifacts
  return `\uFEFF${csvBody}`
}
