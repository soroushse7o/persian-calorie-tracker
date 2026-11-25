import { describe, expect, it } from 'vitest'
import { DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import type { FoodItem } from '../types/nutrition'
import {
  extractCleanFoodName,
  normalizePersian,
  parsePersianFoodInput,
  toCompactKey,
} from './persianFoodParser'

describe('Persian Text Normalization', () => {
  it('normalizes Arabic kaf/yeh, Persian/Arabic digits, and ZWNJ variations', () => {
    expect(normalizePersian('۲ كفگير قورمه‌سبزي')).toBe('2 کفگیر قورمه سبزی')
    expect(normalizePersian('٢.٥ لیوان دوغ')).toBe('2.5 لیوان دوغ')
    expect(normalizePersian('۱٫۵ کفگیر برنج')).toBe('1.5 کفگیر برنج')
    expect(toCompactKey('قورمهسبزی')).toBe(toCompactKey('قورمه‌سبزی'))
    expect(toCompactKey('قورمه سبزی')).toBe(toCompactKey('قورمه‌سبزی'))
  })
})

describe('Persian Natural Language Food Parser', () => {
  it('parses the primary multi-item Iranian lunch example accurately', () => {
    const result = parsePersianFoodInput(
      'دو کفگیر قورمهسبزی و یک کف دست سنگک و نصف لیوان دوغ',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(3)

    expect(result.items[0].food.id).toBe('ghormeh-sabzi')
    expect(result.items[0].quantity).toBe(2)
    expect(result.items[0].unit).toBe('کفگیر')
    expect(result.items[0].totalGrams).toBe(240)
    expect(result.items[0].kcal).toBe(Math.round(145 * 2.4))

    expect(result.items[1].food.id).toBe('nan-sangak')
    expect(result.items[1].quantity).toBe(1)
    expect(result.items[1].unit).toBe('کف دست')
    expect(result.items[1].totalGrams).toBe(30)

    expect(result.items[2].food.id).toBe('doogh')
    expect(result.items[2].quantity).toBe(0.5)
    expect(result.items[2].unit).toBe('لیوان')
    expect(result.items[2].totalGrams).toBe(120)
  })

  it('parses the verification sentence without ZWNJ', () => {
    const result = parsePersianFoodInput(
      'دو کفگیر قورمهسبزی و یک کف دست سنگک',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(2)
    expect(result.items[0].food.name).toBe('قورمه‌سبزی')
    expect(result.items[0].quantity).toBe(2)
    expect(result.items[0].unit).toBe('کفگیر')
    expect(result.items[1].food.name).toBe('نان سنگک')
    expect(result.items[1].quantity).toBe(1)
    expect(result.items[1].unit).toBe('کف دست')
  })

  it('handles Persian word numbers, colloquial "یه", and compound half-units ("یک و نیم", "دو و نیم")', () => {
    const result = parsePersianFoodInput(
      'یک و نیم کفگیر برنج کته و یه سیخ جوجه کباب و نیم لیوان ماست و سه عدد خرما',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(4)

    expect(result.items[0].food.id).toBe('berenj-kateh')
    expect(result.items[0].quantity).toBe(1.5)
    expect(result.items[0].unit).toBe('کفگیر')

    expect(result.items[1].food.id).toBe('joojeh-kabab')
    expect(result.items[1].quantity).toBe(1)
    expect(result.items[1].unit).toBe('سیخ')

    expect(result.items[2].food.id).toBe('yogurt')
    expect(result.items[2].quantity).toBe(0.5)
    expect(result.items[2].unit).toBe('لیوان')

    expect(result.items[3].food.id).toBe('dates')
    expect(result.items[3].quantity).toBe(3)
    expect(result.items[3].unit).toBe('عدد')
  })

  it('handles Persian, English, and Arabic digits plus fractions and grams', () => {
    const result = parsePersianFoodInput(
      '2 قاشق غذاخوری عسل + ۲ قاشق چایخوری کره، ١٥٠ گرم سینه مرغ گریل\n1/2 کاسه آش رشته',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(4)

    expect(result.items[0].food.id).toBe('honey')
    expect(result.items[0].quantity).toBe(2)
    expect(result.items[0].unit).toBe('قاشق غذاخوری')

    expect(result.items[1].food.id).toBe('butter')
    expect(result.items[1].quantity).toBe(2)
    expect(result.items[1].unit).toBe('قاشق چای‌خوری')

    expect(result.items[2].food.id).toBe('grilled-chicken-breast')
    expect(result.items[2].quantity).toBe(150)
    expect(result.items[2].unit).toBe('گرم')
    expect(result.items[2].totalGrams).toBe(150)

    expect(result.items[3].food.id).toBe('ash-reshteh')
    expect(result.items[3].quantity).toBe(0.5)
    expect(result.items[3].unit).toBe('کاسه')
  })

  it('handles attached digits/units, reversed word order, and implicit quantities', () => {
    const result = parsePersianFoodInput(
      'برنج آبکش 200گرم، نان تست 2 برش، پیاله ماست، موز',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(4)

    expect(result.items[0].food.id).toBe('berenj-abkesh')
    expect(result.items[0].quantity).toBe(200)
    expect(result.items[0].unit).toBe('گرم')

    expect(result.items[1].food.id).toBe('nan-toast')
    expect(result.items[1].quantity).toBe(2)
    expect(result.items[1].unit).toBe('برش')

    expect(result.items[2].food.id).toBe('yogurt')
    expect(result.items[2].quantity).toBe(1)
    expect(result.items[2].unit).toBe('پیاله')

    expect(result.items[3].food.id).toBe('banana')
    expect(result.items[3].quantity).toBe(1)
    expect(result.items[3].unit).toBe('عدد')
  })

  it('handles ZWNJ, Arabic characters, and minor spelling/typo variations via fuzzy matching', () => {
    const result = parsePersianFoodInput(
      'يك پرس زرشکپلو با مرغ و دو عدد تخممرغ آبپز و یک کفگیر فنسجان',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(3)
    expect(result.items[0].food.id).toBe('zereshk-polo-morgh')
    expect(result.items[1].food.id).toBe('boiled-egg')
    expect(result.items[2].food.id).toBe('fesenjan')
  })

  it('preserves dishes containing "و" such as "کشک و بادمجان" and "ارده و شیره"', () => {
    const result = parsePersianFoodInput(
      'یک کاسه کشک و بادمجان و دو قاشق ارده و شیره',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(2)
    expect(result.items[0].food.id).toBe('kashk-bademjan')
    expect(result.items[1].food.id).toBe('ardeh-shireh')
    expect(result.items[1].quantity).toBe(2)
    expect(result.items[1].unit).toBe('قاشق غذاخوری')
  })

  it('distinguishes similar dish names accurately (قیمه vs قیمه بادمجان, چای vs چای شیرین)', () => {
    const result = parsePersianFoodInput(
      'یک کفگیر قیمه بادمجان و یک لیوان چای شیرین',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.items).toHaveLength(2)
    expect(result.items[0].food.id).toBe('gheymeh-bademjan')
    expect(result.items[1].food.id).toBe('sweet-tea')
  })

  it('supports custom user-added foods with custom household units dynamically', () => {
    const customSoup: FoodItem = {
      id: 'custom-barley-soup',
      name: 'سوپ جو خانگی',
      aliases: ['سوپ جو'],
      category: 'stews_mains',
      per100g: { kcal: 80, protein: 3.5, carbs: 12.0, fat: 2.0 },
      defaultUnit: 'ملاقه مخصوص',
      units: [
        { name: 'ملاقه مخصوص', grams: 175 },
        { name: 'گرم', grams: 1 },
      ],
      isCustom: true,
    }

    const result = parsePersianFoodInput('دو ملاقه مخصوص سوپ جو خانگی', [
      ...DEFAULT_IRANIAN_FOODS,
      customSoup,
    ])

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(1)
    expect(result.items[0].food.id).toBe('custom-barley-soup')
    expect(result.items[0].quantity).toBe(2)
    expect(result.items[0].unit).toBe('ملاقه مخصوص')
    expect(result.items[0].totalGrams).toBe(350)
    expect(result.items[0].kcal).toBe(280)
  })

  it('reports unmatched segments cleanly without failing valid items in the same sentence', () => {
    const result = parsePersianFoodInput(
      'یک عدد سیب و دو عدد غذای ناشناخته عجیب',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.items).toHaveLength(1)
    expect(result.items[0].food.id).toBe('apple')
    expect(result.unmatchedSegments).toHaveLength(1)
  })

  it('covers all everyday Iranian household units and number words (چهار, دوتا, برگ, تکه, پیاله, قاشق)', () => {
    const result = parsePersianFoodInput(
      'چهار قاشق برنج کته + دوتا تخم‌مرغ آب‌پز + یک برگ لواش + دو تکه کوکو سبزی + یک پیاله ماست',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(5)

    expect(result.items[0]).toMatchObject({ quantity: 4, unit: 'قاشق غذاخوری' })
    expect(result.items[0].food.id).toBe('berenj-kateh')

    expect(result.items[1]).toMatchObject({ quantity: 2, unit: 'عدد' })
    expect(result.items[1].food.id).toBe('boiled-egg')

    expect(result.items[2]).toMatchObject({ quantity: 1, unit: 'برگ' })
    expect(result.items[2].food.id).toBe('nan-lavash')

    expect(result.items[3]).toMatchObject({ quantity: 2, unit: 'تکه' })
    expect(result.items[3].food.id).toBe('kuku-sabzi')

    expect(result.items[4]).toMatchObject({ quantity: 1, unit: 'پیاله' })
    expect(result.items[4].food.id).toBe('yogurt')
  })

  it('handles Persian decimal numbers and compound two-and-a-half quantities', () => {
    const result = parsePersianFoodInput(
      '۱٫۵ سیخ کباب کوبیده و دو و نیم کفگیر برنج آبکش',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({ quantity: 1.5, unit: 'سیخ' })
    expect(result.items[0].food.id).toBe('kabab-koobideh')
    expect(result.items[1]).toMatchObject({ quantity: 2.5, unit: 'کفگیر' })
    expect(result.items[1].food.id).toBe('berenj-abkesh')
  })

  it('parses expanded everyday Iranian dishes and units (ته‌چین، خورش کرفس، حلیم، بستنی سنتی، قهوه لاته)', () => {
    const result = parsePersianFoodInput(
      'یک تکه ته‌چین مرغ و دو کفگیر خورش کرفس و دو اسکوپ بستنی سنتی و یک لیوان قهوه لاته',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(4)
    expect(result.items[0].food.id).toBe('tahchin-morgh')
    expect(result.items[1].food.id).toBe('khoresht-karafs')
    expect(result.items[2].food.id).toBe('saffron-ice-cream')
    expect(result.items[2].unit).toBe('اسکوپ')
    expect(result.items[2].quantity).toBe(2)
    expect(result.items[3].food.id).toBe('cafe-latte')
  })

  it('flags ambiguous generic terms like "برنج" with concrete alternatives for 1-tap disambiguation', () => {
    const result = parsePersianFoodInput('دو کفگیر برنج', DEFAULT_IRANIAN_FOODS)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].isAmbiguous).toBe(true)
    const altIds = (result.items[0].alternatives ?? []).map((f) => f.id)
    expect(altIds).toContain('berenj-abkesh')
  })

  it('strips quantity and unit cleanly for 1-click custom food creation from unmatched segments', () => {
    expect(extractCleanFoodName('دو کاسه غذای محلی ناشناخته', DEFAULT_IRANIAN_FOODS)).toBe(
      'غذای محلی ناشناخته',
    )
    expect(extractCleanFoodName('150 گرم خوراک مخصوص', DEFAULT_IRANIAN_FOODS)).toBe('خوراک مخصوص')
  })

  it('parses compound Persian number words (صد و پنجاه، بیست و پنج، صد و بیست و پنج) without splitting on و', () => {
    const result = parsePersianFoodInput(
      'صد و پنجاه گرم سینه مرغ گریل و بیست و پنج عدد پسته و صد و بیست و پنج گرم نان سنگک',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(3)
    expect(result.items[0]).toMatchObject({ quantity: 150, unit: 'گرم', totalGrams: 150 })
    expect(result.items[0].food.id).toBe('grilled-chicken-breast')
    expect(result.items[1]).toMatchObject({ quantity: 25, unit: 'عدد' })
    expect(result.items[1].food.id).toBe('pistachio')
    expect(result.items[2]).toMatchObject({ quantity: 125, unit: 'گرم', totalGrams: 125 })
    expect(result.items[2].food.id).toBe('nan-sangak')
  })

  it('handles punctuation, colloquial "نصف یه", and "کیلو / کیلوگرم" weight units', () => {
    const result = parsePersianFoodInput(
      'دو کفگیر قورمه‌سبزی! و نصف یه موز و نیم کیلو هندوانه.',
      DEFAULT_IRANIAN_FOODS,
    )

    expect(result.unmatchedSegments).toEqual([])
    expect(result.items).toHaveLength(3)
    expect(result.items[0]).toMatchObject({ quantity: 2, unit: 'کفگیر' })
    expect(result.items[0].food.id).toBe('ghormeh-sabzi')
    expect(result.items[1]).toMatchObject({ quantity: 0.5, unit: 'عدد' })
    expect(result.items[1].food.id).toBe('banana')
    expect(result.items[2]).toMatchObject({ quantity: 0.5, unit: 'کیلوگرم', totalGrams: 500 })
    expect(result.items[2].food.id).toBe('watermelon')
  })

  it('ensures pre-seeded Iranian food database has 300+ items with valid macros and zero alias collisions', () => {
    expect(DEFAULT_IRANIAN_FOODS.length).toBeGreaterThanOrEqual(300)
    const seenIds = new Set<string>()
    const seenCompactPhrases = new Map<string, string>()

    for (const food of DEFAULT_IRANIAN_FOODS) {
      expect(seenIds.has(food.id)).toBe(false)
      seenIds.add(food.id)
      expect(food.units.length).toBeGreaterThanOrEqual(2)
      expect(food.per100g.kcal).toBeGreaterThan(0)

      for (const phrase of [food.name, ...food.aliases]) {
        const key = toCompactKey(phrase)
        const existingOwner = seenCompactPhrases.get(key)
        if (existingOwner && existingOwner !== food.id) {
          throw new Error(`Duplicate catalog phrase "${phrase}" shared by ${existingOwner} and ${food.id}`)
        }
        seenCompactPhrases.set(key, food.id)
      }
    }
  })
})
