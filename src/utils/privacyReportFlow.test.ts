import { describe, expect, it, vi } from 'vitest'
import { buildAnonymousBetaIssueUrl, buildReviewedBetaIssueUrl } from '../config/feedback'
import {
  buildRedactedBetaMarkdownReport,
  sanitizeUnmatchedPhraseForLocalLog,
  type ComputedBetaSummary,
} from './localMetrics'

const SUMMARY: ComputedBetaSummary = {
  totalSubmissions: 4,
  totalParsedItems: 9,
  totalUnmatchedCount: 1,
  unmatchedRatePct: 10,
  activeDaysCount: 2,
  spanDays: 3,
  avgLogsPerActiveDay: 2,
  retentionRatioPct: 66.7,
  topUnmatched: [{ phrase: 'کیک هویج', count: 1 }],
}

describe('local beta report privacy', () => {
  it('redacts names, health terms, emails, mentions and numbers from free-text phrases', () => {
    const cleaned = sanitizeUnmatchedPhraseForLocalLog(
      'آقای محمد دیابت من user@test.com @soroush ۰۹۱۲۱۲۳۴۵۶۷ کیک هویج',
    )
    expect(cleaned).not.toBeNull()
    expect(cleaned).not.toContain('محمد')
    expect(cleaned).not.toContain('دیابت')
    expect(cleaned).not.toContain('user@test.com')
    expect(cleaned).not.toContain('@soroush')
    expect(cleaned).not.toContain('۰۹۱۲')
    expect(cleaned).toContain('کیک هویج')
    expect(cleaned).toContain('[ردشده]')

    // Previously stored phrases are re-sanitized on read too (no need to rewrite tests).
    expect(sanitizeUnmatchedPhraseForLocalLog('خانم مریم سرطان خورش آلو')).not.toContain('مریم')
    expect(sanitizeUnmatchedPhraseForLocalLog('خورش آلو مسما محلی')).toBe('خورش آلو مسما محلی')
  })

  it('does not describe redacted free text as anonymous', () => {
    const report = buildRedactedBetaMarkdownReport(SUMMARY)
    expect(report).not.toContain('ناشناس')
    expect(report).toContain('پالایش')
    expect(report).toContain('کیک هویج')
    expect(report).toContain('پیش از باز کردن لینک گیتهاب')
  })
})

describe('beta issue link confirmation step', () => {
  it('publishes the exact reviewed report in the GitHub issue body', () => {
    const report = '###گزارش محلی تست 1'
    const url = buildReviewedBetaIssueUrl(report)
    expect(url).toContain('/issues/new?')
    expect(url).toContain(encodeURIComponent(report).replace(/%20/g, '+'))
    expect(url).not.toContain('ناشناس')
  })

  it('opens a local preview with the exact report before the GitHub link', async () => {
    const report = '<script>alert(1)</script>گزارش دقیق تست 2'
    let captured: Blob | null = null
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      captured = blob as Blob
      return 'blob:preview-test'
    })
    try {
      expect(buildAnonymousBetaIssueUrl(report)).toBe('blob:preview-test')
      expect(captured).not.toBeNull()
      const html = await (captured as unknown as Blob).text()
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
      expect(html).not.toContain('<script>alert(1)</script>')
      expect(html).toContain('گزارش دقیق تست 2')
      expect(html).toContain('تأیید کردم')
      expect(html).toContain('issues/new')
      expect(html).not.toContain('<script>')
      // Repeated calls reuse the same confirmation page (no duplicate object URLs).
      expect(buildAnonymousBetaIssueUrl(report)).toBe('blob:preview-test')
      expect(createSpy).toHaveBeenCalledTimes(1)
    } finally {
      createSpy.mockRestore()
    }
  })
})
