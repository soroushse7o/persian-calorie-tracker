import type { FoodItem } from '../../types/nutrition'
import { boundedDamerauLevenshtein, normalizePersian, toSpaceKey } from './normalize'
import { BUILTIN_UNITS, type UnitPattern } from './unitsAndQuantities'

export const VAV_PLACEHOLDER = '__VAV__'

const FILLER_WORDS = new Set(['از', 'مقداری', 'حدود', 'تقریبا', 'کمی', 'مقدار', 'کامل', 'متوسط'])

/**
 * Ambiguous generic Persian terms where multiple dishes differ significantly
 * in calories (e.g. برنج کته vs برنج آبکش، ماست معمولی vs ماست پرچرب/یونانی).
 */
const AMBIGUOUS_GENERIC_QUERIES: Record<string, string[]> = {
  برنج: ['berenj-kateh', 'berenj-abkesh', 'berenj-ghahvei'],
  پلو: ['berenj-kateh', 'berenj-abkesh', 'baghali-polo'],
  چلو: ['berenj-kateh', 'berenj-abkesh'],
  ماست: ['yogurt', 'yogurt-highfat', 'strained-yogurt', 'greek-yogurt'],
  پنیر: ['white-cheese', 'lighvan-cheese', 'cream-cheese', 'cottage-cheese'],
  شیر: ['milk', 'milk-fullfat', 'chocolate-milk'],
  کباب: ['kabab-koobideh', 'joojeh-kabab', 'kabab-barg', 'kabab-chenjeh'],
  پیتزا: ['pizza-makhloot', 'pizza-pepperoni', 'pizza-margherita', 'pizza-chicken'],
  شیرینی: ['dry-pastry', 'danish-pastry', 'napoleon-pastry', 'baklava'],
  بستنی: ['saffron-ice-cream', 'packaged-icecream-bar'],
  شکلات: ['milk-chocolate', 'dark-chocolate-70'],
  ماهی: ['grilled-trout', 'fried-fish', 'salmon-grilled'],
  سوپ: ['barley-soup', 'soup-vermicelli', 'soup-mushroom'],
  بیسکویت: ['biscuit-mother', 'petit-beurre', 'sagheh-talayi'],
  مرغ: ['grilled-chicken-breast', 'chicken-thigh-cooked'],
  مرغسوخاری: ['chicken-strips', 'fried-chicken-drumstick'],
}

export interface PreparedCandidate {
  space: string
  compact: string
  tokens: string[]
}

export interface PreparedFoodItem {
  food: FoodItem
  primary: PreparedCandidate
  aliases: PreparedCandidate[]
  searchCompacts: string[]
  searchSpaces: string[]
}

export interface VavDishRule {
  dish: string
  regex: RegExp
  replacement: string
}

export interface PreparedCatalogIndex {
  items: PreparedFoodItem[]
  byId: Map<string, FoodItem>
  vavDishes: VavDishRule[]
  unitPatterns: UnitPattern[]
}

export interface FoodMatchResult {
  food: FoodItem
  confidence: number
  isAmbiguous: boolean
  alternatives: FoodItem[]
}

const FOOD_ITEM_CACHE = new WeakMap<FoodItem, PreparedFoodItem>()
const CATALOG_INDEX_CACHE = new WeakMap<FoodItem[], PreparedCatalogIndex>()

function prepareCandidate(text: string): PreparedCandidate {
  const space = toSpaceKey(text)
  const compact = space.replace(/[\s\u200C\-_]+/g, '')
  const tokens = space ? space.split(' ').filter((t) => t.length >= 2) : []
  return { space, compact, tokens }
}

export function getPreparedFoodItem(food: FoodItem): PreparedFoodItem {
  const cached = FOOD_ITEM_CACHE.get(food)
  if (cached) return cached

  const safeAliases = Array.isArray(food.aliases) ? food.aliases : []
  const safeUnits = Array.isArray(food.units) ? food.units : []

  const primary = prepareCandidate(food.name)
  const aliases = safeAliases.map(prepareCandidate)
  const unitPrepared = safeUnits.map((u) => prepareCandidate(u.name))

  const searchCompacts = [
    primary.compact,
    ...aliases.map((a) => a.compact),
    ...unitPrepared.map((u) => u.compact),
  ].filter(Boolean)

  const searchSpaces = [
    primary.space,
    ...aliases.map((a) => a.space),
    ...unitPrepared.map((u) => u.space),
  ].filter(Boolean)

  const prepared: PreparedFoodItem = {
    food,
    primary,
    aliases,
    searchCompacts,
    searchSpaces,
  }
  FOOD_ITEM_CACHE.set(food, prepared)
  return prepared
}

function buildUnitPatterns(foods: FoodItem[]): UnitPattern[] {
  const patterns: UnitPattern[] = []
  const seen = new Set<string>()

  const addPattern = (canonical: string, phrase: string) => {
    const norm = toSpaceKey(phrase)
    if (!norm) return
    const key = `${canonical}::${norm}`
    if (seen.has(key)) return
    seen.add(key)
    patterns.push({
      canonical,
      tokens: norm.split(' '),
      compact: norm.replace(/\s+/g, ''),
    })
  }

  for (const food of foods) {
    if (!Array.isArray(food.units)) continue
    for (const unit of food.units) {
      addPattern(unit.name, unit.name)
      if (unit.aliases) {
        for (const alias of unit.aliases) {
          addPattern(unit.name, alias)
        }
      }
    }
  }

  for (const def of BUILTIN_UNITS) {
    addPattern(def.canonical, def.canonical)
    for (const syn of def.synonyms) {
      addPattern(def.canonical, syn)
    }
  }

  patterns.sort((a, b) => {
    if (b.tokens.length !== a.tokens.length) return b.tokens.length - a.tokens.length
    return b.compact.length - a.compact.length
  })

  return patterns
}

export function getCatalogIndex(foods: FoodItem[]): PreparedCatalogIndex {
  const cached = CATALOG_INDEX_CACHE.get(foods)
  if (cached) return cached

  const items = foods.map(getPreparedFoodItem)
  const byId = new Map<string, FoodItem>()
  const rawVavSet = new Set<string>()

  for (const food of foods) {
    byId.set(food.id, food)
    const names = [food.name, ...(Array.isArray(food.aliases) ? food.aliases : [])]
    for (const n of names) {
      const normName = normalizePersian(n)
      if (normName.includes(' و ')) {
        rawVavSet.add(normName)
      }
    }
  }

  const vavDishes: VavDishRule[] = Array.from(rawVavSet)
    .sort((a, b) => b.length - a.length)
    .map((dish) => ({
      dish,
      regex: new RegExp(dish.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      replacement: dish.replace(/ و /g, ` ${VAV_PLACEHOLDER} `),
    }))

  const unitPatterns = buildUnitPatterns(foods)

  const index: PreparedCatalogIndex = { items, byId, vavDishes, unitPatterns }
  CATALOG_INDEX_CACHE.set(foods, index)
  return index
}

function scorePreparedCandidate(
  qTokens: string[],
  queryCompact: string,
  cand: PreparedCandidate,
): number {
  const candCompact = cand.compact
  if (!queryCompact || !candCompact) return 0

  const qLen = queryCompact.length
  const cLen = candCompact.length

  if (queryCompact === candCompact) return 1.0

  if (qLen <= cLen) {
    if (qLen >= 2 && candCompact.startsWith(queryCompact)) {
      return 0.85 + (qLen / cLen) * 0.12
    }
    if (qLen >= 3 && candCompact.includes(queryCompact)) {
      return 0.78 + (qLen / cLen) * 0.14
    }
  } else {
    if (cLen >= 3 && queryCompact.startsWith(candCompact)) {
      return 0.8 + (cLen / qLen) * 0.12
    }
    if (cLen >= 3 && queryCompact.includes(candCompact)) {
      return 0.74 + (cLen / qLen) * 0.14
    }
  }

  const cTokens = cand.tokens
  if (qTokens.length > 0 && cTokens.length > 0) {
    let matched = 0
    for (let i = 0; i < qTokens.length; i++) {
      const qt = qTokens[i]
      for (let j = 0; j < cTokens.length; j++) {
        const ct = cTokens[j]
        if (ct === qt || ct.includes(qt) || qt.includes(ct)) {
          matched++
          break
        }
      }
    }
    if (matched > 0) {
      const precision = matched / qTokens.length
      const recall = matched / cTokens.length
      const f1 = (2 * precision * recall) / (precision + recall)
      if (f1 >= 0.55) {
        return 0.65 + f1 * 0.22
      }
    }
  }

  const maxLen = Math.max(qLen, cLen)
  if (maxLen >= 4 && Math.abs(qLen - cLen) <= 2) {
    const dist = boundedDamerauLevenshtein(queryCompact, candCompact, 2)
    if (dist <= 2) {
      const similarity = 1 - dist / maxLen
      if (similarity >= 0.68) {
        return similarity * 0.9
      }
    }
  }

  return 0
}

/** Finds the best matching FoodItem plus ambiguity/alternative suggestions using the cached index. */
export function matchFoodInDatabase(foodQuery: string, foods: FoodItem[]): FoodMatchResult | null {
  const cleaned = foodQuery
    .split(' ')
    .filter((token) => token && !FILLER_WORDS.has(token))
    .join(' ')
    .trim()

  const querySpace = toSpaceKey(cleaned || foodQuery)
  const queryCompact = querySpace.replace(/[\s\u200C\-_]+/g, '')
  if (!queryCompact || queryCompact.length < 2) return null

  const qTokens = querySpace.split(' ').filter((t) => t.length >= 2)
  const { items, byId } = getCatalogIndex(foods)
  const scored: Array<{ food: FoodItem; score: number }> = []

  for (let i = 0; i < items.length; i++) {
    const entry = items[i]
    let foodBest = scorePreparedCandidate(qTokens, queryCompact, entry.primary)
    if (foodBest < 1.0) {
      for (let j = 0; j < entry.aliases.length; j++) {
        const aliasScore = scorePreparedCandidate(qTokens, queryCompact, entry.aliases[j])
        const adjusted = aliasScore === 1.0 ? 0.995 : aliasScore * 0.99
        if (adjusted > foodBest) {
          foodBest = adjusted
          if (foodBest >= 0.995) break
        }
      }
    }
    if (foodBest >= 0.64) {
      scored.push({ food: entry.food, score: foodBest })
    }
  }

  if (scored.length === 0) return null
  scored.sort((a, b) => b.score - a.score)

  const top = scored[0]
  const confidence = Math.round(top.score * 100) / 100

  const genericIds = AMBIGUOUS_GENERIC_QUERIES[queryCompact]
  let alternatives: FoodItem[] = []
  let isAmbiguous = false

  if (genericIds) {
    alternatives = genericIds
      .filter((id) => id !== top.food.id)
      .map((id) => byId.get(id))
      .filter((f): f is FoodItem => Boolean(f))
      .slice(0, 3)
    if (alternatives.length > 0) {
      isAmbiguous = true
    }
  } else if (confidence < 0.86) {
    alternatives = scored
      .slice(1, 4)
      .filter((s) => s.score >= 0.68)
      .map((s) => s.food)
    isAmbiguous = true
  } else if (scored.length > 1 && top.score < 0.98 && top.score - scored[1].score <= 0.04) {
    alternatives = scored.slice(1, 4).map((s) => s.food)
    isAmbiguous = true
  }

  return {
    food: top.food,
    confidence,
    isAmbiguous,
    alternatives,
  }
}

/** Fast Persian search using precomputed food search keys (O(1) per candidate). */
export function matchesFoodSearch(food: FoodItem, query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return true

  const qSpace = toSpaceKey(trimmed)
  const qCompact = qSpace.replace(/[\s\u200C\-_]+/g, '')
  if (!qCompact) return true

  const prepared = getPreparedFoodItem(food)
  for (let i = 0; i < prepared.searchCompacts.length; i++) {
    if (prepared.searchCompacts[i].includes(qCompact)) return true
  }
  for (let i = 0; i < prepared.searchSpaces.length; i++) {
    if (prepared.searchSpaces[i].includes(qSpace)) return true
  }
  return false
}
