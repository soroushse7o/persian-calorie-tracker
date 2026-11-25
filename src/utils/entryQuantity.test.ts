import { describe, expect, it } from 'vitest'
import type { FoodItem, LoggedFoodEntry } from '../types/nutrition'
import { buildEditableUnitOptions, isWeightUnit, parseEditableQuantity } from './entryQuantity'

const food: FoodItem = {
  id: 'f1',
  name: 'برنج',
  aliases: [],
  category: 'stews_mains',
  per100g: { kcal: 148, protein: 2.7, carbs: 28.4, fat: 2.6 },
  defaultUnit: 'کفگیر',
  units: [{ name: 'کفگیر', grams: 30 }],
}

const entry: LoggedFoodEntry = {
  id: 'e1',
  dateKey: '2026-11-25',
  timestamp: 1000,
  mealType: 'lunch',
  foodId: 'f1',
  foodName: 'برنج',
  quantity: 1,
  unit: 'کفگیر',
  totalGrams: 30,
  kcal: 44,
  protein: 0.8,
  carbs: 8.5,
  fat: 0.8,
  per100g: food.per100g,
}

describe('Editable gram quantity helpers', () => {
  it('parses Persian and Arabic-Indic digit input', () => {
    expect(parseEditableQuantity('۲۵')).toBe(25)
    expect(parseEditableQuantity('٣٥')).toBe(35)
    expect(parseEditableQuantity('12.5')).toBe(12.5)
    expect(parseEditableQuantity('۰')).toBeNull()
    expect(parseEditableQuantity('abc')).toBeNull()
    expect(parseEditableQuantity('')).toBeNull()
  })

  it('always offers a gram unit and preserves an inherited unit weight', () => {
    const options = buildEditableUnitOptions(food, entry)
    expect(options.map((o) => o.name)).toEqual(['گرم', 'کفگیر'])
    expect(options.find((o) => o.name === 'کفگیر')?.grams).toBe(30)
    expect(options.find((o) => o.name === 'گرم')?.grams).toBe(1)
  })

  it('keeps real grams-per-unit for an unknown legacy unit', () => {
    const legacy = { ...entry, unit: 'پیاله', quantity: 2, totalGrams: 100 }
    const options = buildEditableUnitOptions(undefined, legacy)
    expect(options.find((o) => o.name === 'پیاله')?.grams).toBe(50)
    expect(options.find((o) => o.name === 'گرم')?.grams).toBe(1)
  })

  it('recognizes both weight units', () => {
    expect(isWeightUnit('گرم')).toBe(true)
    expect(isWeightUnit('میلیلیتر')).toBe(true)
    expect(isWeightUnit('کفگیر')).toBe(false)
  })
})
