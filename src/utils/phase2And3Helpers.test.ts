import { describe, expect, it } from 'vitest'
import { DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import { DEFAULT_USER_GOALS, type LoggedFoodEntry } from '../types/nutrition'
import { buildPersianDailyReport, buildPersianWeeklyReport } from './dailySummaryShare'
import { computeRecentAndFrequentFoods } from './foodSuggestions'
import {
  buildAnonymousBetaMarkdownReport,
  clearLocalBetaMetrics,
  computeBetaSummary,
  readLocalBetaMetrics,
  recordLocalSubmissionMetrics,
  recordUnmatchedPhraseTap,
  sanitizeUnmatchedPhraseForLocalLog,
} from './localMetrics'
import {
  buildRobotsTxt,
  buildSitemapXml,
  injectAbsoluteSiteMetadata,
  validateSiteUrlForBuild,
} from './siteMeta'

describe('Build Site Metadata, Local Beta Metrics & Phase 3 Growth Helpers', () => {
  it('strictly throws when VITE_SITE_URL is missing or invalid and injects absolute canonical/OG/sitemap', () => {
    expect(() => validateSiteUrlForBuild(undefined)).toThrow(/VITE_SITE_URL/)
    expect(() => validateSiteUrlForBuild('   ')).toThrow(/VITE_SITE_URL/)
    expect(() => validateSiteUrlForBuild('not-a-url')).toThrow(/not a valid absolute URL/)
    expect(() => validateSiteUrlForBuild('ftp://example.com')).toThrow(/protocol/)

    const siteUrl = validateSiteUrlForBuild('https://kalorishomar.ir///')
    expect(siteUrl).toBe('https://kalorishomar.ir')

    const rawHtml = [
      '<html><head>',
      '<meta property="og:url" content="/" />',
      '<meta property="og:image" content="/og-image.png" />',
      '<meta name="twitter:image" content="/og-image.png" />',
      '</head></html>',
    ].join('\n')

    const injected = injectAbsoluteSiteMetadata(rawHtml, siteUrl)
    expect(injected).toContain('<link rel="canonical" href="https://kalorishomar.ir/" />')
    expect(injected).toContain('<meta property="og:url" content="https://kalorishomar.ir/" />')
    expect(injected).toContain(
      '<meta property="og:image" content="https://kalorishomar.ir/og-image.png" />',
    )
    expect(injected).toContain(
      '<meta name="twitter:image" content="https://kalorishomar.ir/og-image.png" />',
    )

    expect(buildSitemapXml(siteUrl, '2026-11-24')).toContain('<loc>https://kalorishomar.ir/</loc>')
    expect(buildRobotsTxt(siteUrl)).toContain('Sitemap: https://kalorishomar.ir/sitemap.xml')
  })

  it('records 100% local beta metrics, scrubs PII from unmatched phrases, and formats anonymous report', () => {
    expect(
      sanitizeUnmatchedPhraseForLocalLog('ایمیل user@test.com شماره ۰۹۱۲۱۲۳۴۵۶۷ کیک هویج'),
    ).toBe('ایمیل شماره کیک هویج')

    const mem = new Map<string, string>()
    const mockStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v)
      },
      removeItem: (k: string) => {
        mem.delete(k)
      },
    }

    recordLocalSubmissionMetrics(
      {
        dateKey: '2026-11-20',
        parsedItemsCount: 3,
        unmatchedSegments: ['خورش آلو مسما محلی'],
      },
      mockStorage,
    )
    recordUnmatchedPhraseTap('خورش آلو مسما محلی', '2026-11-21', mockStorage)

    const metrics = readLocalBetaMetrics(mockStorage)
    expect(metrics.totalSubmissions).toBe(1)
    expect(metrics.totalParsedItems).toBe(3)
    expect(metrics.totalUnmatchedCount).toBe(2)
    expect(metrics.unmatchedPhrases['خورش آلو مسما محلی']).toBe(2)

    const entries: LoggedFoodEntry[] = [
      {
        id: '1',
        dateKey: '2026-11-20',
        timestamp: 1000,
        mealType: 'lunch',
        foodId: 'ghormeh-sabzi',
        foodName: 'قورمه‌سبزی',
        quantity: 2,
        unit: 'کفگیر',
        totalGrams: 240,
        kcal: 348,
        protein: 20,
        carbs: 15,
        fat: 23,
      },
    ]

    const summary = computeBetaSummary(metrics, entries, '2026-11-21')
    expect(summary.unmatchedRatePct).toBe(40) // 2 / (3+2)
    expect(summary.activeDaysCount).toBe(1)
    expect(summary.spanDays).toBe(2)

    const report = buildAnonymousBetaMarkdownReport(summary)
    expect(report).toContain('خورش آلو مسما محلی')

    clearLocalBetaMetrics(mockStorage)
    expect(readLocalBetaMetrics(mockStorage).totalSubmissions).toBe(0)
  })

  it('computes recent and frequent foods and formats daily/weekly Persian reports cleanly', () => {
    const mk = (id: string, foodId: string, name: string, ts: number): LoggedFoodEntry => ({
      id,
      dateKey: '2026-11-24',
      timestamp: ts,
      mealType: 'breakfast',
      foodId,
      foodName: name,
      quantity: 1,
      unit: 'کف دست',
      totalGrams: 30,
      kcal: 77,
      protein: 2.7,
      carbs: 15,
      fat: 0.7,
    })

    const entries = [
      mk('1', 'nan-sangak', 'نان سنگک', 300),
      mk('2', 'boiled-egg', 'تخم‌مرغ آب‌پز', 200),
      mk('3', 'nan-sangak', 'نان سنگک', 100),
    ]

    const { recentFoods, frequentFoods } = computeRecentAndFrequentFoods(
      entries,
      DEFAULT_IRANIAN_FOODS,
    )
    expect(recentFoods.map((r) => r.food.id)).toEqual(['nan-sangak', 'boiled-egg'])
    expect(frequentFoods).toHaveLength(1)
    expect(frequentFoods[0].food.id).toBe('nan-sangak')
    expect(frequentFoods[0].count).toBe(2)

    const dailyText = buildPersianDailyReport({
      appName: 'کالری‌شمار روزمره',
      jalaliDateLabel: 'یکشنبه ۳ آذر ۱۴۰۵',
      consumed: { kcal: 2150, protein: 110, carbs: 240, fat: 70 },
      goals: DEFAULT_USER_GOALS,
      waterGlasses: 7,
      entries,
    })
    expect(dailyText).toContain('بالاتر از محدوده هدف')
    expect(dailyText).toContain('نان سنگک')

    const weeklyText = buildPersianWeeklyReport({
      appName: 'کالری‌شمار روزمره',
      periodLabel: '۲۸ آبان تا ۴ آذر',
      activeDaysCount: 5,
      avgKcal: 1920,
      goalKcal: 2000,
      withinGoalDays: 4,
      avgProtein: 112,
      avgCarbs: 210,
      avgFat: 62,
      days: [{ label: 'امروز', kcal: 1920 }],
    })
    expect(weeklyText).toContain('گزارش هفتگی کالری‌شمار روزمره')
  })
})
