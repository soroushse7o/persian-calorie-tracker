import { toAsciiDigits } from '../persianFormat'

/**
 * Normalizes Persian/Arabic characters, digits, ZWNJ, non-decimal punctuation,
 * and whitespace into a clean canonical form suitable for tokenization and matching.
 */
export function normalizePersian(input: string): string {
  return toAsciiDigits(input)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // remove diacritics & tatweel
    .replace(/ك/g, 'ک')
    .replace(/[يىئ]/g, 'ی')
    .replace(/ة/g, 'ه')
    .replace(/[أإ]/g, 'ا')
    .replace(/٫/g, '.')
    .replace(/\u200C/g, ' ') // ZWNJ -> space for consistent tokenization
    .replace(/[!؟?()"«»'`[\]{}:]/g, ' ') // strip non-structural punctuation
    .replace(/(^|[^\d])\.(?=[^\d]|$)/g, '$1 ') // strip standalone/trailing dots while keeping 1.5
    .replace(/(\d+(?:\.\d+)?)([^\d.\s/+،,;؛])/g, '$1 $2') // separate "150گرم" -> "150 گرم"
    .replace(/([^\d.\s/+،,;؛])(\d+(?:\.\d+)?)/g, '$1 $2') // separate "برنج150" -> "برنج 150"
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Creates a comparison key where spaces, ZWNJ, and Alef-Madda (آ vs ا)
 * are collapsed so "قورمهسبزی", "قورمه سبزی", and "قورمه‌سبزی" match identically.
 */
export function toCompactKey(input: string): string {
  return normalizePersian(input)
    .replace(/آ/g, 'ا')
    .replace(/[\s\u200C\-_]+/g, '')
}

/**
 * Creates a space-separated comparison key with Alef-Madda normalized (آ -> ا).
 */
export function toSpaceKey(input: string): string {
  return normalizePersian(input).replace(/آ/g, 'ا').replace(/\s+/g, ' ').trim()
}

// Reusable flat typed-array rows for zero-GC Damerau-Levenshtein bounded to maxLen <= 64
const DL_CAP = 65
const dlRowPrev2 = new Uint16Array(DL_CAP)
const dlRowPrev1 = new Uint16Array(DL_CAP)
const dlRowCurr = new Uint16Array(DL_CAP)

/**
 * Bounded Optimal String Alignment (Damerau-Levenshtein) distance with
 * O(1) memory (zero heap allocations) and early exit when distance > maxDist.
 */
export function boundedDamerauLevenshtein(a: string, b: string, maxDist = 2): number {
  const m = a.length
  const n = b.length
  if (Math.abs(m - n) > maxDist) return maxDist + 1
  if (m === 0) return n
  if (n === 0) return m
  if (n >= DL_CAP) return maxDist + 1

  let prev2 = dlRowPrev2
  let prev1 = dlRowPrev1
  let curr = dlRowCurr

  for (let j = 0; j <= n; j++) prev1[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    let rowMin = curr[0]
    const aChar = a.charCodeAt(i - 1)

    for (let j = 1; j <= n; j++) {
      const bChar = b.charCodeAt(j - 1)
      const cost = aChar === bChar ? 0 : 1
      let best = Math.min(prev1[j] + 1, curr[j - 1] + 1, prev1[j - 1] + cost)
      if (i > 1 && j > 1 && aChar === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === bChar) {
        best = Math.min(best, prev2[j - 2] + 1)
      }
      curr[j] = best
      if (best < rowMin) rowMin = best
    }

    if (rowMin > maxDist) return maxDist + 1

    const tmp = prev2
    prev2 = prev1
    prev1 = curr
    curr = tmp
  }

  return prev1[n]
}
