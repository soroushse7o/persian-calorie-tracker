import type { MacroValues } from '../../types/nutrition'
import { toSpaceKey } from './normalize'

export interface CookingModifierSpec {
  id: 'lean' | 'rich' | 'low_sodium'
  label: string
  fatMultiplier: number
  minFatDelta: number
  sodiumMultiplier?: number
  phrases: string[]
}

const COOKING_MODIFIERS: CookingModifierSpec[] = [
  {
    id: 'lean',
    label: 'کم‌روغن / رژیمی',
    fatMultiplier: 0.7,
    minFatDelta: -0.5,
    phrases: [
      'بدون روغن',
      'بدون کره',
      'کم روغن',
      'کم چرب',
      'با ایرفرایر',
      'در ایرفرایر',
      'ایرفرایر',
      'هواپز',
      'رژیمی',
      'بخارپز',
    ],
  },
  {
    id: 'rich',
    label: 'پرچرب / با کره',
    fatMultiplier: 1.35,
    minFatDelta: 3.0,
    phrases: ['با کره', 'کره ای', 'پر روغن', 'پرروغن', 'پرچرب', 'پر چرب', 'چرب و چیلی'],
  },
  {
    id: 'low_sodium',
    label: 'کم‌نمک / بی‌نمک',
    fatMultiplier: 1.0,
    minFatDelta: 0,
    sodiumMultiplier: 0.35,
    phrases: ['بدون نمک', 'بی نمک', 'کم نمک', 'رژیمی کم نمک'],
  },
]

export interface ExtractedCookingModifier {
  strippedQuery: string
  modifier: CookingModifierSpec | null
  modifiers: CookingModifierSpec[]
  combinedLabel: string | null
}

/**
 * Extracts one or more Persian cooking/sodium preparation modifiers from a food query
 * (e.g. "قورمه‌سبزی کم‌روغن و کم‌نمک", "دوغ بی‌نمک", "برنج با کره").
 */
export function extractCookingModifier(foodQuery: string): ExtractedCookingModifier {
  let working = toSpaceKey(foodQuery)
  if (!working) {
    return { strippedQuery: foodQuery, modifier: null, modifiers: [], combinedLabel: null }
  }

  const found: CookingModifierSpec[] = []

  for (const spec of COOKING_MODIFIERS) {
    // Do not combine mutually exclusive lean + rich
    if (spec.id === 'rich' && found.some((m) => m.id === 'lean')) continue

    for (const phrase of spec.phrases) {
      const normPhrase = toSpaceKey(phrase)
      const escaped = normPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`)
      if (re.test(working)) {
        const candidate = working
          .replace(re, ' ')
          .replace(/(?:^|\s)و(?=\s|$)/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        if (candidate.length >= 2) {
          working = candidate
          found.push(spec)
          break
        }
      }
    }
  }

  if (found.length === 0) {
    return { strippedQuery: foodQuery, modifier: null, modifiers: [], combinedLabel: null }
  }

  return {
    strippedQuery: working,
    modifier: found[0],
    modifiers: found,
    combinedLabel: found.map((m) => m.label).join(' · '),
  }
}

/** Adjusts per-100g fat, kcal, and/or sodium transparently according to one or more cooking modifiers. */
export function applyCookingModifierToPer100g(
  base: MacroValues,
  modifierOrList: CookingModifierSpec | readonly CookingModifierSpec[],
): MacroValues {
  const list = Array.isArray(modifierOrList) ? modifierOrList : [modifierOrList]
  let current: MacroValues = { ...base }

  for (const modifier of list) {
    if (modifier.id === 'lean') {
      if (current.fat >= 1.5) {
        const nextFat = Math.max(0.5, Math.round(current.fat * modifier.fatMultiplier * 10) / 10)
        const deltaFat = nextFat - current.fat
        const nextKcal = Math.max(5, Math.round((current.kcal + deltaFat * 9) * 10) / 10)
        current = { ...current, kcal: nextKcal, fat: nextFat }
      }
    } else if (modifier.id === 'rich') {
      const scaled = current.fat * modifier.fatMultiplier
      const withFloor = Math.max(scaled, current.fat + modifier.minFatDelta)
      const nextFat = Math.round(withFloor * 10) / 10
      const deltaFat = nextFat - current.fat
      const nextKcal = Math.max(5, Math.round((current.kcal + deltaFat * 9) * 10) / 10)
      current = { ...current, kcal: nextKcal, fat: nextFat }
    } else if (modifier.id === 'low_sodium' && modifier.sodiumMultiplier !== undefined) {
      const prevSodium = current.micronutrients?.sodiumMg
      if (typeof prevSodium === 'number' && prevSodium > 0) {
        current = {
          ...current,
          micronutrients: {
            ...current.micronutrients,
            sodiumMg: Math.round(prevSodium * modifier.sodiumMultiplier),
          },
        }
      }
    }
  }

  return current
}
