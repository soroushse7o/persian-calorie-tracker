import { describe, expect, it } from 'vitest'
import { analyzeBackupJson, MAX_BACKUP_JSON_CHARS } from './backup'
import {
  MAX_ENTRIES,
  MAX_FOODS,
  MAX_NAME_LENGTH,
  MAX_TEMPLATES,
  sanitizeEntryList,
  sanitizeFoodList,
  sanitizeImportedEntry,
  sanitizeImportedFood,
  sanitizeTemplateList,
} from './sanitizers'

const BASE_FOOD = {
  id: 'custom-long-name',
  name: 'سیب',
  aliases: [],
  category: 'drinks_snacks',
  per100g: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  defaultUnit: 'عدد',
  units: [
    { name: 'عدد', grams: 180 },
    { name: 'گرم', grams: 1 },
  ],
  isCustom: true,
}

const BASE_ENTRY = {
  id: 'entry-1',
  dateKey: '2026-11-24',
  timestamp: 1000,
  mealType: 'snack',
  foodId: 'apple',
  foodName: 'سیب',
  quantity: 1,
  unit: 'عدد',
  totalGrams: 180,
  kcal: 94,
  protein: 0.5,
  carbs: 25.2,
  fat: 0.4,
}

describe('Sanitizer and backup size regression', () => {
  it('clips oversized names and text to a bounded length without dropping valid data', () => {
    const food = sanitizeImportedFood({ ...BASE_FOOD, name: 'سیب'.repeat(2000), source: 'x'.repeat(5000) })
    expect(food).not.toBeNull()
    expect(food!.name.length).toBe(MAX_NAME_LENGTH)
    expect(food!.source!.length).toBeLessThanOrEqual(1000)

    const short = sanitizeImportedFood(BASE_FOOD)
    expect(short?.name).toBe('سیب')

    const entry = sanitizeImportedEntry({ ...BASE_ENTRY, foodName: 'سیب'.repeat(1000), sourceText: 'y'.repeat(5000) })
    expect(entry?.foodName.length).toBe(MAX_NAME_LENGTH)
    expect(entry?.sourceText!.length).toBeLessThanOrEqual(1000)
  })

  it('caps oversized collections so hostile files cannot allocate unbounded arrays', () => {
    const foods = Array.from({ length: MAX_FOODS + 50 }, (_, i) => ({ ...BASE_FOOD, id: `f-${i}` }))
    const entries = Array.from({ length: MAX_ENTRIES + 50 }, (_, i) => ({ ...BASE_ENTRY, id: `e-${i}` }))
    const templates = Array.from({ length: MAX_TEMPLATES + 50 }, (_, i) => ({
      id: `t-${i}`,
      name: 'الگو',
      mealType: 'snack',
      items: [{ foodName: 'سیب', kcal: 90 }],
    }))

    expect(sanitizeFoodList(foods)).toHaveLength(MAX_FOODS)
    expect(sanitizeEntryList(entries)).toHaveLength(MAX_ENTRIES)
    expect(sanitizeTemplateList(templates)).toHaveLength(MAX_TEMPLATES)
  })

  it('rejects oversized backup JSON before parsing it', () => {
    const huge = 'x'.repeat(MAX_BACKUP_JSON_CHARS + 1)
    const result = analyzeBackupJson(huge)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('بزرگ')
  })

  it('rejects a structurally valid backup with an absurd number of entries', () => {
    const raw = JSON.stringify({
      version: 3,
      customFoods: [],
      foodOverrides: {},
      entries: Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => ({ ...BASE_ENTRY, id: `e-${i}` })),
    })
    const result = analyzeBackupJson(raw)
    expect(result.ok).toBe(false)
  })
})
