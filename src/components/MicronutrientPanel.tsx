import { ArrowLeft, ChevronDown, Info, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FoodItem, LoggedFoodEntry, MicronutrientKey } from '../types/nutrition'
import {
  computeMicronutrientSummary,
  type MicronutrientUserProfile,
} from '../utils/micronutrients'
import { formatFaNumber } from '../utils/persianFormat'
import { MicronutrientRadarChart } from './charts/NativeCharts'

interface MicronutrientPanelProps {
  entries: readonly LoggedFoodEntry[]
  foods: readonly FoodItem[]
  divisorDays?: number
  periodTitle?: string
  compact?: boolean
  userProfile?: MicronutrientUserProfile
  onExploreRichFoods?: (nutrientKey: MicronutrientKey) => void
}

type GroupFilter = 'all' | 'vitamin' | 'mineral'

/**
 * Interactive Micronutrient Inspector (Vitamins, Minerals & Sodium Ceiling).
 * Supports personalized DRI benchmarks (sex/age), Light/Dark theme tokens,
 * top food contributors, and 1-tap navigation to rich foods in FoodDatabaseTab.
 */
export function MicronutrientPanel({
  entries,
  foods,
  divisorDays = 1,
  periodTitle = 'امروز',
  compact = false,
  userProfile,
  onExploreRichFoods,
}: MicronutrientPanelProps) {
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const foodById = useMemo(() => {
    const map = new Map<string, FoodItem>()
    for (const f of foods) map.set(f.id, f)
    return map
  }, [foods])

  const summary = useMemo(
    () => computeMicronutrientSummary(entries, foodById, divisorDays, userProfile),
    [divisorDays, entries, foodById, userProfile],
  )

  const filteredItems = useMemo(() => {
    if (groupFilter === 'all') return summary.items
    if (groupFilter === 'vitamin') {
      return summary.items.filter((i) => i.spec.group === 'vitamin')
    }
    return summary.items.filter((i) => i.spec.group === 'mineral' || i.spec.group === 'limit')
  }, [groupFilter, summary.items])

  if (!summary.hasAnyIntake) {
    return (
      <div
        data-testid="micronutrient-panel-empty"
        className="rounded-xl bg-[#141418] border border-[#24242C] p-4 text-center text-xs text-zinc-400 leading-relaxed"
      >
        با ثبت وعده‌های غذایی، نمودار راداری ویتامین‌ها و املاح معدنی (آهن، کلسیم، پتاسیم، منیزیم،
        روی، سدیم و ویتامین‌های A، C، D، B12) در اینجا محاسبه و نمایش داده می‌شود.
      </div>
    )
  }

  return (
    <div className="space-y-3.5" data-testid="micronutrient-panel">
      <div
        className={`rounded-2xl bg-[#131317] border border-[#25252D] p-3.5 ${
          compact ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-12 gap-4 items-center'
        }`}
      >
        <div className={compact ? '' : 'md:col-span-5'}>
          <MicronutrientRadarChart
            items={summary.items}
            selectedKey={expandedKey}
            onSelectKey={(k) => setExpandedKey((prev) => (prev === k ? null : k))}
          />
        </div>

        <div className={compact ? 'space-y-2.5' : 'md:col-span-7 space-y-3'}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-zinc-100">
                  تراز ویتامین‌ها و املاح ({periodTitle})
                </span>
                <span
                  data-testid="micronutrient-profile-badge"
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#1E1E22] border border-[#2C2C33] text-zinc-300"
                >
                  {summary.profileLabel}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                روی هر ریزمغزی بزنید تا سهم غذاهای خود و منابع پیشنهادی را ببینید.
              </p>
            </div>
            <span
              data-testid="micronutrient-balance-score"
              className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-300 tabular-nums-fa"
            >
              پوشش کل: {formatFaNumber(summary.overallBalancePct)}٪
            </span>
          </div>

          <div className="inline-flex rounded-xl bg-[#0C0C0D] p-1 border border-[#26262E]">
            {(
              [
                { id: 'all', label: 'همه (۱۰)' },
                { id: 'mineral', label: 'املاح و سدیم (۶)' },
                { id: 'vitamin', label: 'ویتامین‌ها (۴)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`micro-filter-${tab.id}`}
                aria-pressed={groupFilter === tab.id}
                onClick={() => setGroupFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  groupFilter === tab.id
                    ? 'bg-emerald-500 text-[#051B11] font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-start gap-1.5 text-[10px] text-zinc-400 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
            <span>
              مقادیر مرجع روزانه بر اساس استاندارد بزرگسالان (USDA / IOM) و تقریبی هستند؛ برای سدیم،
              عدد ۲٬۳۰۰ میلی‌گرم «سقف مجاز روزانه» است.
            </span>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-2'} gap-2`}>
        {filteredItems.map((item) => {
          const isOpen = expandedKey === item.spec.key
          const isLimit = Boolean(item.spec.isUpperLimit)

          let barColor = 'bg-emerald-400'
          let badgeClass = 'bg-emerald-500/15 text-emerald-300'
          if (isLimit) {
            if (item.status === 'over_limit') {
              barColor = 'bg-rose-400'
              badgeClass = 'bg-rose-500/15 text-rose-300'
            } else if (item.status === 'near_limit') {
              barColor = 'bg-amber-400'
              badgeClass = 'bg-amber-500/15 text-amber-300'
            } else {
              barColor = 'bg-teal-400'
              badgeClass = 'bg-teal-500/15 text-teal-300'
            }
          } else if (item.status === 'moderate') {
            barColor = 'bg-amber-400'
            badgeClass = 'bg-amber-500/15 text-amber-300'
          } else if (item.status === 'low') {
            barColor = 'bg-zinc-500'
            badgeClass = 'bg-zinc-500/20 text-zinc-300'
          }

          return (
            <div
              key={item.spec.key}
              data-testid={`micro-item-${item.spec.key}`}
              className="rounded-xl bg-[#16161B] border border-[#26262F] px-3 py-2.5 transition-colors"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`micro-detail-${item.spec.key}`}
                onClick={() =>
                  setExpandedKey((prev) => (prev === item.spec.key ? null : item.spec.key))
                }
                className="w-full text-right space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-zinc-100 truncate">{item.spec.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${badgeClass}`}
                    >
                      {formatFaNumber(item.pctOfRef)}٪
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 tabular-nums-fa text-[11px] text-zinc-300">
                    <span className="font-bold text-zinc-100">
                      {formatFaNumber(item.amount, item.spec.decimals)}
                    </span>
                    <span className="text-zinc-500">/</span>
                    <span className="text-zinc-400">
                      {formatFaNumber(item.effectiveDailyRef)} {item.spec.unit}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>

                <div
                  className="h-1.5 rounded-full bg-[#24242C] overflow-hidden"
                  role="meter"
                  aria-label={`پوشش ${item.spec.label}`}
                  aria-valuemin={0}
                  aria-valuemax={item.effectiveDailyRef || 1}
                  aria-valuenow={item.amount}
                >
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-500`}
                    style={{ width: `${item.clampedPct}%` }}
                  />
                </div>
              </button>

              {isOpen && (
                <div
                  id={`micro-detail-${item.spec.key}`}
                  data-testid={`micro-detail-${item.spec.key}`}
                  className="mt-2.5 pt-2 border-t border-[#25252E] space-y-2 text-[11px] leading-relaxed"
                >
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>وضعیت فعلی:</span>
                    <span className="font-semibold">{item.statusLabel}</span>
                  </div>

                  {item.topContributors.length > 0 ? (
                    <div className="text-zinc-300 tabular-nums-fa">
                      <span className="text-zinc-400">بیشترین سهم در وعده‌های شما: </span>
                      {item.topContributors.map((c, idx) => (
                        <span key={c.foodName}>
                          {idx > 0 ? ' • ' : ''}
                          <strong className="text-emerald-400 font-semibold">{c.foodName}</strong> (
                          {formatFaNumber(c.amount, item.spec.decimals)} {item.spec.unitShort})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-400">در وعده‌های ثبت‌شده مقدار قابل‌توجهی نداشته است.</p>
                  )}

                  <div className="text-zinc-400">
                    <span className="text-sky-400 font-medium">
                      {isLimit ? 'نکته تعادل مصرف: ' : 'منابع غذایی غنی: '}
                    </span>
                    <span>{item.spec.richSourcesHint}</span>
                  </div>

                  {onExploreRichFoods && (
                    <button
                      type="button"
                      data-testid={`explore-rich-${item.spec.key}`}
                      onClick={() => onExploreRichFoods(item.spec.key)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline pt-0.5"
                    >
                      <span>
                        {isLimit
                          ? 'مشاهده غذاهای کم‌سدیم در بانک غذا'
                          : `مشاهده غذاهای غنی از ${item.spec.shortLabel} در بانک غذا`}
                      </span>
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
