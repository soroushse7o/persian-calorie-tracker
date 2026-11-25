import { describe, expect, it } from 'vitest'
import { matchQuantityAtStart } from './unitsAndQuantities'

describe('Quantity parsing: own-property lookups only', () => {
  it.each(['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty'])(
    'does not treat inherited Object.prototype key "%s" as a numeric word',
    (token) => {
      expect(matchQuantityAtStart([token, 'کفگیر'])).toBeNull()
      expect(matchQuantityAtStart([token, 'و', 'پنجاه'])).toBeNull()
      expect(matchQuantityAtStart([token])).toBeNull()
    },
  )

  it('still parses genuine Persian number words, including compound integers', () => {
    expect(matchQuantityAtStart(['صد', 'و', 'بیست', 'و', 'پنج'])).toEqual({
      quantity: 125,
      consumedTokens: 5,
    })
    expect(matchQuantityAtStart(['بیست', 'و', 'پنج'])).toEqual({
      quantity: 25,
      consumedTokens: 3,
    })
    expect(matchQuantityAtStart(['پنج', 'و', 'نیم'])).toEqual({
      quantity: 5.5,
      consumedTokens: 3,
    })
    expect(matchQuantityAtStart(['دو'])).toEqual({ quantity: 2, consumedTokens: 1 })
  })
})
