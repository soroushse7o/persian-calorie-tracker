import { describe, expect, it } from 'vitest'
import { DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import { recomputeUpdatedEntry } from '../store/entryMath'
import { normalizeGoals, sanitizeImportedFood } from '../store/sanitizers'
import { getMealTypeLabels, MEAL_BUDGET_RATIOS } from '../types/nutrition'
import {
  decryptBackupJson,
  encryptBackupJson,
  isEncryptedBackupEnvelope,
} from './cryptoBackup'
import { buildJalaliMonthCalendar, JALALI_WEEKDAY_HEADERS, shiftJalaliMonth } from './jalaliCalendar'
import {
  DEFAULT_REMINDER_SETTINGS,
  dispatchLocalNotification,
  evaluateDueReminder,
  readReminderSettings,
  requestNotificationPermissionIfNeeded,
  writeReminderSettings,
} from './localReminders'
import {
  applyCookingModifierToPer100g,
  extractCookingModifier,
  findFoodByBarcode,
  getInlineFoodAutocomplete,
  parsePersianFoodInput,
} from './persianFoodParser'

describe('v1.2.0 — 10 Quality & UX Upgrades Suite', () => {
  describe('Cooking Modifiers & Fiber in Parser', () => {
    it('reduces fat & calories when lean cooking modifiers are used on Iranian dishes', () => {
      const normal = parsePersianFoodInput('دو کفگیر قورمه‌سبزی', DEFAULT_IRANIAN_FOODS)
      const lean = parsePersianFoodInput('دو کفگیر قورمه‌سبزی کم‌روغن', DEFAULT_IRANIAN_FOODS)

      expect(normal.items).toHaveLength(1)
      expect(lean.items).toHaveLength(1)
      expect(lean.items[0]?.food.id).toBe('ghormeh-sabzi')
      expect(lean.items[0]?.modifierLabel).toBe('کم‌روغن / رژیمی')
      expect(lean.items[0]!.fat).toBeLessThan(normal.items[0]!.fat)
      expect(lean.items[0]!.kcal).toBeLessThan(normal.items[0]!.kcal)
    })

    it('increases fat & calories when rich/butter modifiers are used', () => {
      const normal = parsePersianFoodInput('یک پرس برنج ساده پخته', DEFAULT_IRANIAN_FOODS)
      const rich = parsePersianFoodInput('یک پرس برنج ساده پخته با کره', DEFAULT_IRANIAN_FOODS)

      expect(rich.items).toHaveLength(1)
      expect(rich.items[0]?.modifierLabel).toBe('پرچرب / با کره')
      expect(rich.items[0]!.fat).toBeGreaterThan(normal.items[0]!.fat)
      expect(rich.items[0]!.kcal).toBeGreaterThan(normal.items[0]!.kcal)
    })

    it('preserves exact catalog matches like شیر کم‌چرب without double-applying modifiers', () => {
      const milk = parsePersianFoodInput('یک لیوان شیر کم‌چرب', DEFAULT_IRANIAN_FOODS)
      expect(milk.items).toHaveLength(1)
      expect(milk.items[0]?.food.id).toBe('milk')
      expect(milk.items[0]?.modifierLabel).toBeUndefined()
    })

    it('keeps lean modifier safe on ultra-low-fat foods and computes fiber accurately', () => {
      expect(extractCookingModifier('')).toMatchObject({
        strippedQuery: '',
        modifier: null,
        modifiers: [],
      })
      const extracted = extractCookingModifier('سیب‌زمینی در ایرفرایر')
      expect(extracted.modifier?.id).toBe('lean')
      expect(extracted.strippedQuery).toBe('سیب زمینی')

      const unchanged = applyCookingModifierToPer100g(
        { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 },
        extracted.modifier!,
      )
      expect(unchanged.kcal).toBe(52)

      const sangak = parsePersianFoodInput('دو کف دست نان سنگک', DEFAULT_IRANIAN_FOODS)
      expect(sangak.items[0]!.fiber).toBeGreaterThan(2)
    })

    it('preserves modified per100g when editing quantity via recomputeUpdatedEntry', () => {
      const lean = parsePersianFoodInput('یک کفگیر قورمه‌سبزی کم‌روغن', DEFAULT_IRANIAN_FOODS)
      const item = lean.items[0]!
      const updated = recomputeUpdatedEntry(
        {
          id: 'e1',
          dateKey: '2026-11-24',
          timestamp: 1,
          mealType: 'lunch',
          foodId: item.food.id,
          foodName: item.food.name,
          sourceText: item.rawSegment,
          quantity: item.quantity,
          unit: item.unit,
          totalGrams: item.totalGrams,
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
          per100g: item.food.per100g,
          modifierLabel: item.modifierLabel,
        },
        { quantity: 2 },
        DEFAULT_IRANIAN_FOODS,
      )
      expect(updated.kcal).toBeCloseTo(item.kcal * 2, -1)
      expect(updated.fiber).toBeGreaterThan(0)
    })
  })

  describe('Live Inline Autocomplete & Iranian 626 Barcode Lookup', () => {
    it('completes trailing partial food query while preserving leading quantity/unit & context', () => {
      expect(getInlineFoodAutocomplete('', DEFAULT_IRANIAN_FOODS)).toEqual([])
      expect(getInlineFoodAutocomplete('   ', DEFAULT_IRANIAN_FOODS)).toEqual([])
      expect(getInlineFoodAutocomplete('ق', DEFAULT_IRANIAN_FOODS)).toEqual([])

      const suggestions = getInlineFoodAutocomplete(
        'یک لیوان دوغ و دو کفگیر قورم',
        DEFAULT_IRANIAN_FOODS,
        new Set(['ghormeh-sabzi']),
      )
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0]?.food.id).toBe('ghormeh-sabzi')
      expect(suggestions[0]?.unit).toBe('کفگیر')
      expect(suggestions[0]?.quantity).toBe(2)
      expect(suggestions[0]?.completedInput).toBe('یک لیوان دوغ و دو کفگیر قورمه‌سبزی')

      // Alias prefix completion
      const aliasSuggestions = getInlineFoodAutocomplete('نیمرو', DEFAULT_IRANIAN_FOODS)
      expect(aliasSuggestions.length).toBeGreaterThan(0)
    })

    it('normalizes Persian/Arabic digits and finds Iranian 626 packaged foods by barcode', () => {
      expect(findFoodByBarcode('123', DEFAULT_IRANIAN_FOODS)).toBeNull()
      const sagheh = findFoodByBarcode('۶۲۶۰۱۰۱۲۰۰۱۱۲', DEFAULT_IRANIAN_FOODS)
      expect(sagheh?.id).toBe('sagheh-talayi')
      expect(findFoodByBarcode('6269999999999', DEFAULT_IRANIAN_FOODS)).toBeNull()
    })
  })

  describe('Jalali (Shamsi) Monthly Calendar Grid', () => {
    it('builds accurate Jalali month grids with logged indicators and navigates months cleanly', () => {
      expect(JALALI_WEEKDAY_HEADERS).toHaveLength(7)
      const logged = new Set(['2026-11-22', '2026-11-24'])
      const grid = buildJalaliMonthCalendar('2026-11-24', '2026-11-24', logged)

      expect(grid.days.length).toBeGreaterThanOrEqual(29)
      expect(grid.days.length).toBeLessThanOrEqual(31)
      expect(grid.days[0]?.jalaliDay).toBe(1)
      expect(grid.leadingEmptyCells).toBeGreaterThanOrEqual(0)
      expect(grid.leadingEmptyCells).toBeLessThan(7)

      const todayCell = grid.days.find((d) => d.dateKey === '2026-11-24')
      expect(todayCell?.isToday).toBe(true)
      expect(todayCell?.hasEntries).toBe(true)

      const prevFirst = shiftJalaliMonth('2026-11-24', -1)
      const nextFirst = shiftJalaliMonth('2026-11-24', 1)
      expect(prevFirst < grid.firstDayDateKey).toBe(true)
      expect(nextFirst > grid.lastDayDateKey).toBe(true)
    })
  })

  describe('Web Crypto PBKDF2 + AES-256-GCM Password-Encrypted Backups', () => {
    it('encrypts and decrypts backup JSON round-trip and rejects wrong passwords or bad payloads', async () => {
      const samplePlain = JSON.stringify({ version: 3, entries: [{ id: '1', kcal: 250 }] })

      await expect(encryptBackupJson(samplePlain, '12')).rejects.toThrow()

      const encrypted = await encryptBackupJson(samplePlain, 'MyStrongPass!1405')
      expect(isEncryptedBackupEnvelope(encrypted)).toBe(true)
      expect(isEncryptedBackupEnvelope(samplePlain)).toBe(false)
      expect(isEncryptedBackupEnvelope('not-json')).toBe(false)

      const noPass = await decryptBackupJson(encrypted, '')
      expect(noPass.ok).toBe(false)

      const badPass = await decryptBackupJson(encrypted, 'WrongPassword99')
      expect(badPass.ok).toBe(false)

      const badJson = await decryptBackupJson('{invalid', 'MyStrongPass!1405')
      expect(badJson.ok).toBe(false)

      const missingFields = await decryptBackupJson('{"version":1}', 'MyStrongPass!1405')
      expect(missingFields.ok).toBe(false)

      const ok = await decryptBackupJson(encrypted, 'MyStrongPass!1405')
      expect(ok.ok).toBe(true)
      if (ok.ok) {
        expect(ok.plainJson).toBe(samplePlain)
      }
    })
  })

  describe('Local Opt-in Reminders & Ramadan/Fasting Schedule Mode', () => {
    it('reads/writes reminder settings safely and evaluates evening & hydration triggers', async () => {
      const mem = new Map<string, string>()
      const mockStorage = {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => {
          mem.set(k, v)
        },
      }

      expect(readReminderSettings(null)).toEqual(DEFAULT_REMINDER_SETTINGS)
      expect(readReminderSettings(mockStorage)).toEqual(DEFAULT_REMINDER_SETTINGS)
      writeReminderSettings(DEFAULT_REMINDER_SETTINGS, null)

      // Corrupted JSON fallback
      mockStorage.setItem('kalorishomar_v3_reminders', '{broken')
      expect(readReminderSettings(mockStorage)).toEqual(DEFAULT_REMINDER_SETTINGS)

      writeReminderSettings(
        {
          enabled: true,
          dinnerHour: 20,
          waterIntervalMin: 60,
          lastWaterRemindedAt: 1_000_000,
        },
        mockStorage,
      )
      const loaded = readReminderSettings(mockStorage)
      expect(loaded.enabled).toBe(true)
      expect(loaded.dinnerHour).toBe(20)

      // Disabled -> null
      expect(
        evaluateDueReminder({
          settings: { ...loaded, enabled: false },
          nowMs: 9_000_000,
          currentHour: 21,
          todayKey: '2026-11-24',
          hasLoggedDinnerToday: false,
          waterGlassesToday: 2,
          waterGoalGlasses: 8,
        }),
      ).toBeNull()

      // Dinner reminder due at 20:00+
      const dinnerDue = evaluateDueReminder({
        settings: loaded,
        nowMs: 9_000_000,
        currentHour: 20,
        todayKey: '2026-11-24',
        hasLoggedDinnerToday: false,
        waterGlassesToday: 8,
        waterGoalGlasses: 8,
      })
      expect(dinnerDue?.updatedSettings.lastDinnerRemindedDate).toBe('2026-11-24')

      // Hydration reminder due during daytime when dinner not yet due
      const waterDue = evaluateDueReminder({
        settings: loaded,
        nowMs: 1_000_000 + 65 * 60_000,
        currentHour: 14,
        todayKey: '2026-11-24',
        hasLoggedDinnerToday: false,
        waterGlassesToday: 3,
        waterGoalGlasses: 8,
      })
      expect(waterDue?.message).toContain('آب')
      expect(waterDue?.updatedSettings.lastWaterRemindedAt).toBe(1_000_000 + 65 * 60_000)

      // Already met water goal -> null
      expect(
        evaluateDueReminder({
          settings: loaded,
          nowMs: 1_000_000 + 65 * 60_000,
          currentHour: 14,
          todayKey: '2026-11-24',
          hasLoggedDinnerToday: false,
          waterGlassesToday: 8,
          waterGoalGlasses: 8,
        }),
      ).toBeNull()

      dispatchLocalNotification('تست', 'بدنه')
      expect(await requestNotificationPermissionIfNeeded()).toBe('unsupported')
    })

    it('provides Ramadan/fasting labels and sanitizes fiber, barcode & editable recipe fields', () => {
      const ramadanLabels = getMealTypeLabels('ramadan')
      expect(ramadanLabels.breakfast).toContain('سحری')
      expect(ramadanLabels.lunch).toContain('افطاری')
      expect(MEAL_BUDGET_RATIOS.ramadan.lunch).toBeGreaterThan(MEAL_BUDGET_RATIOS.ramadan.dinner)

      const goals = normalizeGoals({
        dailyKcal: 2000,
        proteinGrams: 130,
        carbsGrams: 220,
        fatGrams: 65,
        fiberGrams: 32,
        waterGoalGlasses: 8,
        scheduleMode: 'ramadan',
      })
      expect(goals.fiberGrams).toBe(32)
      expect(goals.scheduleMode).toBe('ramadan')

      const recipe = sanitizeImportedFood({
        id: 'custom-ash',
        name: 'آش خانگی تست',
        aliases: [],
        category: 'stews_mains',
        per100g: { kcal: 120, protein: 6, carbs: 18, fat: 3, fiber: 4.2 },
        defaultUnit: 'کاسه',
        units: [{ name: 'کاسه', grams: 250 }],
        barcode: '6261234567890',
        cookingYieldPct: 85,
        recipeIngredients: [{ foodId: 'adasi', quantity: 2, unit: 'کاسه' }],
      })
      expect(recipe?.per100g.fiber).toBe(4.2)
      expect(recipe?.barcode).toBe('6261234567890')
      expect(recipe?.cookingYieldPct).toBe(85)
      expect(recipe?.recipeIngredients).toHaveLength(1)
    })
  })
})
