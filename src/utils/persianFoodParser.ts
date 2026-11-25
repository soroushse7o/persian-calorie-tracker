export {
  findFoodByBarcode,
  getInlineFoodAutocomplete,
  type AutocompleteSuggestion,
} from './parser/autocomplete'
export {
  matchFoodInDatabase,
  matchesFoodSearch,
  type FoodMatchResult,
} from './parser/catalogIndex'
export { expandCompositeDishSegment } from './parser/compositeDishes'
export {
  applyCookingModifierToPer100g,
  extractCookingModifier,
} from './parser/cookingModifiers'
export { normalizePersian, toCompactKey, toSpaceKey } from './parser/normalize'
export {
  calculateFoodMacros,
  extractCleanFoodName,
  parsePersianFoodInput,
  resolveFoodUnit,
  splitMealSegments,
} from './parser/parseEngine'
