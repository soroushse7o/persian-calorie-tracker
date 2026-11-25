import { describe, expect, it } from 'vitest'
import {
  OFF_COMMUNITY_SOURCE_LABEL,
  VOICE_CLOUD_CONSENT_KEY,
  parseOpenFoodFactsProduct,
  persistVoiceCloudConsent,
  readVoiceCloudConsent,
} from './VoiceAndBarcodeControls'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    snapshot: () => Object.fromEntries(data),
  }
}

const VALID_PRODUCT = {
  status: 1,
  product: {
    product_name: 'چای سبز بسته‌ای',
    serving_quantity: 30,
    nutriments: {
      'energy-kcal_100g': 42.7,
      proteins_100g: 1.2,
      carbohydrates_100g: 9.4,
      fat_100g: 0.3,
      fiber_100g: 1.1,
      sodium_100g: 0.012,
    },
  },
}

describe('Web Speech cloud-audio opt-in', () => {
  it('is off by default and persists only after explicit acceptance', () => {
    const storage = memoryStorage()
    expect(readVoiceCloudConsent(storage)).toBe(false)
    expect(storage.snapshot()).toEqual({})

    persistVoiceCloudConsent(true, storage)
    expect(storage.snapshot()[VOICE_CLOUD_CONSENT_KEY]).toBe('accepted')
    expect(readVoiceCloudConsent(storage)).toBe(true)

    persistVoiceCloudConsent(false, storage)
    expect(readVoiceCloudConsent(storage)).toBe(false)
  })

  it('survives a throwing storage backend without crashing', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readVoiceCloudConsent(broken)).toBe(false)
    expect(() => persistVoiceCloudConsent(true, broken)).not.toThrow()
  })
})

describe('OpenFoodFacts third-party data validation', () => {
  it('accepts plausible data and clamps numeric rounding', () => {
    const result = parseOpenFoodFactsProduct(VALID_PRODUCT, '6260101200112')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.candidate).toMatchObject({
      barcode: '6260101200112',
      name: 'چای سبز بسته‌ای',
      kcal100: 43,
      protein100: 1.2,
      carbs100: 9.4,
      fat100: 0.3,
      fiber100: 1.1,
      sodiumMg100: 12,
      servingGrams: 30,
    })
  })

  it('caps product name length and strips markup/control characters', () => {
    const longName = `<b>${'غ'.repeat(300)}</b>\nesser`
    const result = parseOpenFoodFactsProduct(
      {
        status: 1,
        product: {
          product_name: longName,
          nutriments: { 'energy-kcal_100g': 10 },
        },
      },
      '6260101200112',
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.candidate.name.length).toBeLessThanOrEqual(80)
    expect(result.candidate.name).not.toContain('<b>')
    expect(result.candidate.name).not.toContain('\n')
  })

  it('rejects non-finite and implausible numeric fields', () => {
    const badPayloads: unknown[] = [
      null,
      'not-json',
      { status: 0, product: VALID_PRODUCT.product },
      { status: 1, product: { nutriments: {} } },
      { status: 1, product: { product_name: 123, nutriments: { 'energy-kcal_100g': 10 } } },
      {
        status: 1,
        product: {
          product_name: 'چای',
          nutriments: { 'energy-kcal_100g': Number.POSITIVE_INFINITY },
        },
      },
      {
        status: 1,
        product: {
          product_name: 'چای',
          nutriments: { 'energy-kcal_100g': 'NaN' },
        },
      },
      {
        status: 1,
        product: {
          product_name: 'چای',
          nutriments: { 'energy-kcal_100g': 50_000 },
        },
      },
      {
        status: 1,
        product: {
          product_name: 'چای',
          nutriments: { 'energy-kcal_100g': 50, proteins_100g: 500 },
        },
      },
      {
        status: 1,
        product: {
          product_name: 'چای',
          nutriments: { 'energy-kcal_100g': 50, sodium_100g: 900 },
        },
      },
    ]
    for (const payload of badPayloads) {
      expect(parseOpenFoodFactsProduct(payload, '6260101200112').ok, JSON.stringify(payload)).toBe(
        false,
      )
    }
    expect(parseOpenFoodFactsProduct(VALID_PRODUCT, 'not-a-barcode').ok).toBe(false)
  })

  it('labels imported foods as unverified community data', () => {
    expect(OFF_COMMUNITY_SOURCE_LABEL).toContain('تأییدنشده')
    expect(OFF_COMMUNITY_SOURCE_LABEL).toContain('OpenFoodFacts')
  })
})
