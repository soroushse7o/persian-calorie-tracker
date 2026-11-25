import type {
  FoodItem,
  MicronutrientValues,
  ParseResult,
  ParsedFoodItem,
} from '../../types/nutrition'
import { scaleMicronutrients } from '../micronutrients'
import { getCatalogIndex, matchFoodInDatabase, VAV_PLACEHOLDER } from './catalogIndex'
import { expandCompositeDishSegment } from './compositeDishes'
import {
  applyCookingModifierToPer100g,
  extractCookingModifier,
  type CookingModifierSpec,
} from './cookingModifiers'
import { normalizePersian, toCompactKey } from './normalize'
import {
  BUILTIN_UNITS,
  COMPOUND_FRAC_QTY_REGEX,
  COMPOUND_HUNDREDS_REGEX,
  COMPOUND_HUNDREDS_SMALL_REGEX,
  COMPOUND_TENS_ONES_REGEX,
  matchQuantityAtStart,
  matchUnitAtStart,
  type UnitPattern,
} from './unitsAndQuantities'

/**
 * Splits a multi-item Persian meal string into individual item segments,
 * handling و, +, commas, semicolons, newlines, while preserving compound
 * quantities ("یک و نیم", "صد و پنجاه", "بیست و پنج"), dish names containing "و",
 * and expanding compound meal expressions like "چلوکباب کوبیده" or "نون و پنیر و گردو".
 */
export function splitMealSegments(rawInput: string, foods: FoodItem[]): string[] {
  const lines = rawInput
    .split(/\r?\n/)
    .map((line) => normalizePersian(line))
    .filter(Boolean)
  if (lines.length === 0) return []

  const { vavDishes } = getCatalogIndex(foods)
  const segments: string[] = []

  for (const line of lines) {
    let protectedText = line
      .replace(COMPOUND_HUNDREDS_REGEX, (_m, p1, h, t, o) =>
        o
          ? `${p1}${h} ${VAV_PLACEHOLDER} ${t} ${VAV_PLACEHOLDER} ${o}`
          : `${p1}${h} ${VAV_PLACEHOLDER} ${t}`,
      )
      .replace(COMPOUND_HUNDREDS_SMALL_REGEX, `$1$2 ${VAV_PLACEHOLDER} $3`)
      .replace(COMPOUND_TENS_ONES_REGEX, `$1$2 ${VAV_PLACEHOLDER} $3`)

    protectedText = protectedText.replace(
      COMPOUND_FRAC_QTY_REGEX,
      `$1$2 ${VAV_PLACEHOLDER} $3`,
    )

    // Protect classic compound breakfast phrase "نان/نون و پنیر و گردو" + trailing کم‌نمک/رژیمی
    protectedText = protectedText.replace(
      /(نان|نون)\s+و\s+پنیر\s+و\s+گردو/g,
      `$1 ${VAV_PLACEHOLDER} پنیر ${VAV_PLACEHOLDER} گردو`,
    )

    if (protectedText.includes(' و ')) {
      for (const rule of vavDishes) {
        if (protectedText.includes(rule.dish)) {
          protectedText = protectedText.replace(rule.regex, rule.replacement)
        }
      }
    }

    const rawParts = protectedText
      .split(/(?:[+,،;؛]|\s+(?:به\s+همراه|همراه\s+با)\s+|\s+و\s+)/)
      .map((part) => part.replaceAll(VAV_PLACEHOLDER, 'و').trim())
      .filter(Boolean)

    for (const part of rawParts) {
      segments.push(...expandCompositeDishSegment(part))
    }
  }

  return segments
}

export function resolveFoodUnit(
  food: FoodItem,
  requestedUnit: string | null,
): { unit: string; gramsPerUnit: number } {
  const safeUnits = Array.isArray(food.units) ? food.units : []
  const defaultUnitObj =
    safeUnits.find((u) => toCompactKey(u.name) === toCompactKey(food.defaultUnit)) ??
    safeUnits[0] ?? { name: 'گرم', grams: 1 }

  if (!requestedUnit) {
    return { unit: defaultUnitObj.name, gramsPerUnit: defaultUnitObj.grams }
  }

  const reqCompact = toCompactKey(requestedUnit)

  for (const u of safeUnits) {
    if (toCompactKey(u.name) === reqCompact) {
      return { unit: u.name, gramsPerUnit: u.grams }
    }
    if (u.aliases?.some((a) => toCompactKey(a) === reqCompact)) {
      return { unit: u.name, gramsPerUnit: u.grams }
    }
  }

  if (reqCompact === 'کیلوگرم' || reqCompact === 'کیلو' || reqCompact === 'kg') {
    return { unit: 'کیلوگرم', gramsPerUnit: 1000 }
  }
  if (reqCompact === 'گرم') {
    return { unit: 'گرم', gramsPerUnit: 1 }
  }
  if (reqCompact === 'میلیلیتر') {
    return { unit: 'میلی‌لیتر', gramsPerUnit: 1 }
  }

  if (reqCompact === 'عدد') {
    return { unit: defaultUnitObj.name, gramsPerUnit: defaultUnitObj.grams }
  }

  const builtin = BUILTIN_UNITS.find((b) => toCompactKey(b.canonical) === reqCompact)
  if (builtin) {
    return { unit: builtin.canonical, gramsPerUnit: builtin.fallbackGrams }
  }

  return { unit: defaultUnitObj.name, gramsPerUnit: defaultUnitObj.grams }
}

export function calculateFoodMacros(
  food: FoodItem,
  quantity: number,
  gramsPerUnit: number,
): {
  totalGrams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  micronutrients: MicronutrientValues
} {
  const safeQty = Math.max(0.05, quantity)
  const totalGrams = Math.round(safeQty * gramsPerUnit * 10) / 10
  const factor = totalGrams / 100

  return {
    totalGrams,
    kcal: Math.round(food.per100g.kcal * factor),
    protein: Math.round(food.per100g.protein * factor * 10) / 10,
    carbs: Math.round(food.per100g.carbs * factor * 10) / 10,
    fat: Math.round(food.per100g.fat * factor * 10) / 10,
    fiber: Math.round((food.per100g.fiber ?? 0) * factor * 10) / 10,
    micronutrients: scaleMicronutrients(food.per100g.micronutrients, totalGrams),
  }
}

interface ExtractedSegmentParts {
  quantity: number
  unit: string | null
  foodQuery: string
}

function extractSegmentParts(segment: string, unitPatterns: UnitPattern[]): ExtractedSegmentParts {
  const tokens = segment.split(' ').filter(Boolean)
  if (tokens.length === 0) {
    return { quantity: 1, unit: null, foodQuery: '' }
  }

  const leadingQty = matchQuantityAtStart(tokens)
  if (leadingQty) {
    let idx = leadingQty.consumedTokens
    let unit: string | null = leadingQty.impliedUnit ?? null

    const unitMatch = matchUnitAtStart(tokens.slice(idx), unitPatterns)
    if (unitMatch) {
      unit = unitMatch.canonical
      idx += unitMatch.consumedTokens
    }

    const foodQuery = tokens.slice(idx).join(' ').trim()
    if (foodQuery) {
      return { quantity: leadingQty.quantity, unit, foodQuery }
    }
  }

  const leadingUnit = matchUnitAtStart(tokens, unitPatterns)
  if (leadingUnit) {
    const foodQuery = tokens.slice(leadingUnit.consumedTokens).join(' ').trim()
    if (foodQuery) {
      return { quantity: 1, unit: leadingUnit.canonical, foodQuery }
    }
  }

  for (let splitIdx = 1; splitIdx < tokens.length; splitIdx++) {
    const tail = tokens.slice(splitIdx)
    const tailQty = matchQuantityAtStart(tail)
    if (!tailQty) continue

    const afterQty = tail.slice(tailQty.consumedTokens)
    if (afterQty.length === 0) {
      const foodQuery = tokens.slice(0, splitIdx).join(' ').trim()
      return {
        quantity: tailQty.quantity,
        unit: tailQty.impliedUnit ?? null,
        foodQuery,
      }
    }

    const tailUnit = matchUnitAtStart(afterQty, unitPatterns)
    if (tailUnit && tailUnit.consumedTokens === afterQty.length) {
      const foodQuery = tokens.slice(0, splitIdx).join(' ').trim()
      return {
        quantity: tailQty.quantity,
        unit: tailUnit.canonical,
        foodQuery,
      }
    }
  }

  return { quantity: 1, unit: null, foodQuery: segment }
}

/**
 * Strips leading quantity & unit from an unmatched segment so 1-click
 * "افزودن به بانک غذا" prefills a clean food name (e.g. "دو کاسه غذای خاص" -> "غذای خاص").
 */
export function extractCleanFoodName(rawSegment: string, foods: FoodItem[]): string {
  const norm = normalizePersian(rawSegment)
  if (!norm) return rawSegment.trim()
  const { unitPatterns } = getCatalogIndex(foods)
  const { foodQuery } = extractSegmentParts(norm, unitPatterns)
  return foodQuery || rawSegment.trim()
}

/**
 * Main offline, deterministic Persian Natural Language Food Parser
 * with cooking modifier awareness ("کم‌روغن", "رژیمی", "پرچرب", "با کره", "ایرفرایر").
 */
export function parsePersianFoodInput(input: string, foods: FoodItem[]): ParseResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { items: [], unmatchedSegments: [] }
  }

  const { unitPatterns } = getCatalogIndex(foods)
  const segments = splitMealSegments(trimmed, foods)
  const items: ParsedFoodItem[] = []
  const unmatchedSegments: string[] = []

  segments.forEach((segment, index) => {
    const { quantity, unit: requestedUnit, foodQuery } = extractSegmentParts(segment, unitPatterns)
    if (!foodQuery) {
      unmatchedSegments.push(segment)
      return
    }

    // 1. Try direct match first so built-in items like "شیر کم‌چرب" or "ماست پرچرب" hit exact catalog records
    let match = matchFoodInDatabase(foodQuery, foods)
    let activeModifiers: CookingModifierSpec[] = []
    let modifierLabel: string | null = null

    // 2. If not a near-exact catalog hit, check for cooking/sodium preparation modifiers ("قورمه‌سبزی کم‌روغن", "دوغ بی‌نمک")
    if (!match || match.confidence < 0.96) {
      const extracted = extractCookingModifier(foodQuery)
      if (extracted.modifiers.length > 0) {
        const strippedMatch = matchFoodInDatabase(extracted.strippedQuery, foods)
        if (strippedMatch && (!match || strippedMatch.confidence > match.confidence)) {
          match = strippedMatch
          activeModifiers = extracted.modifiers
          modifierLabel = extracted.combinedLabel
        }
      }
    }

    if (!match) {
      unmatchedSegments.push(segment)
      return
    }

    const effectiveFood: FoodItem =
      activeModifiers.length > 0
        ? {
            ...match.food,
            per100g: applyCookingModifierToPer100g(match.food.per100g, activeModifiers),
          }
        : match.food

    const resolved = resolveFoodUnit(effectiveFood, requestedUnit)
    const macros = calculateFoodMacros(effectiveFood, quantity, resolved.gramsPerUnit)
    const modKey = activeModifiers.length > 0 ? activeModifiers.map((m) => m.id).join('-') : 'std'

    items.push({
      id: `${effectiveFood.id}-${index}-${quantity}-${resolved.unit}-${modKey}`,
      food: effectiveFood,
      quantity,
      unit: resolved.unit,
      gramsPerUnit: resolved.gramsPerUnit,
      totalGrams: macros.totalGrams,
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: macros.fiber,
      micronutrients: macros.micronutrients,
      rawSegment: segment,
      confidence: match.confidence,
      ...(modifierLabel ? { modifierLabel } : {}),
      isAmbiguous: match.isAmbiguous,
      alternatives: match.alternatives,
    })
  })

  return { items, unmatchedSegments }
}
