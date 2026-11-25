import {
  BookmarkPlus,
  Check,
  Coffee,
  Edit3,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Sunset,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  getMealTypeLabels,
  MEAL_BUDGET_RATIOS,
  getMealTypes,
  type FoodItem,
  type LoggedFoodEntry,
  type MealType,
  type UserGoals,
} from '../types/nutrition'
import {
  dateFromKey,
  formatFaNumber,
  formatJalaliDate,
  formatQuantityFa,
  formatTimeFa,
  shiftDateKey,
} from '../utils/persianFormat'
import { buildEditableUnitOptions, isWeightUnit, parseEditableQuantity } from '../utils/entryQuantity'

interface TodayMealsListProps {
  foods: FoodItem[]
  dayEntries: LoggedFoodEntry[]
  allEntries: LoggedFoodEntry[]
  selectedDateKey: string
  todayKey: string
  goals: UserGoals
  onDeleteEntry: (entryId: string) => void
  onUpdateEntry: (
    entryId: string,
    patch: { quantity?: number; unit?: string; mealType?: MealType },
  ) => void
  onRepeatEntries: (entries: LoggedFoodEntry[], targetMealType: MealType) => void
  onSaveTemplate: (name: string, mealType: MealType, items: LoggedFoodEntry[]) => void
}

const MEAL_ICONS: Record<MealType, typeof Sun> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Sunset,
  snack2: Coffee,
  snack3: Sunset,
}

export function TodayMealsList({
  foods,
  dayEntries,
  allEntries,
  selectedDateKey,
  todayKey,
  goals,
  onDeleteEntry,
  onUpdateEntry,
  onRepeatEntries,
  onSaveTemplate,
}: TodayMealsListProps) {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [savingTemplateFor, setSavingTemplateFor] = useState<MealType | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [customSourceDay, setCustomSourceDay] = useState<string | null>(null)

  const scheduleMode = goals.scheduleMode ?? 'standard'
  const mealTypes = getMealTypes(goals.extraSnackCount ?? 0)
  const mealLabels = getMealTypeLabels(scheduleMode, goals.customMealLabels)
  const budgetRatios = MEAL_BUDGET_RATIOS[scheduleMode]

  const foodById = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])

  // Recent logged dates (excluding currently selected date) for arbitrary-day meal copying
  const availableCopyDates = useMemo(() => {
    const distinct = Array.from(
      new Set(allEntries.map((e) => e.dateKey).filter((dk) => dk !== selectedDateKey)),
    ).sort((a, b) => b.localeCompare(a))
    return distinct.slice(0, 8)
  }, [allEntries, selectedDateKey])

  const defaultCopySourceDay = shiftDateKey(selectedDateKey, -1)
  const activeCopySourceDay =
    customSourceDay && availableCopyDates.includes(customSourceDay)
      ? customSourceDay
      : availableCopyDates.includes(defaultCopySourceDay)
        ? defaultCopySourceDay
        : (availableCopyDates[0] ?? defaultCopySourceDay)

  const formatCopyDayLabel = (dk: string) => {
    if (dk === shiftDateKey(todayKey, -1)) return 'دیروز'
    if (dk === todayKey) return 'امروز'
    return formatJalaliDate(dateFromKey(dk), 'short')
  }

  const groupedToday = useMemo(() => {
    const map: Record<MealType, LoggedFoodEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
      snack2: [],
      snack3: [],
    }
    for (const entry of dayEntries) {
      map[entry.mealType]?.push(entry)
    }
    return map
  }, [dayEntries])

  const repeatableMealsFromSource = useMemo(() => {
    const map: Record<MealType, LoggedFoodEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
      snack2: [],
      snack3: [],
    }
    for (const entry of allEntries) {
      if (entry.dateKey === activeCopySourceDay) {
        map[entry.mealType]?.push(entry)
      }
    }
    return mealTypes.map((type) => ({
      mealType: type,
      items: map[type],
      totalKcal: map[type].reduce((sum, e) => sum + e.kcal, 0),
    })).filter((group) => group.items.length > 0)
  }, [activeCopySourceDay, allEntries])

  const hasAnyToday = dayEntries.length > 0

  const handleStepEntryQty = (entry: LoggedFoodEntry, direction: 1 | -1) => {
    const weight = isWeightUnit(entry.unit)
    const step = weight ? 5 : 0.5
    const min = weight ? 1 : 0.25
    const nextQty = Math.max(min, Math.round((entry.quantity + direction * step) * 100) / 100)
    onUpdateEntry(entry.id, { quantity: nextQty })
  }

  return (
    <section aria-label="وعده‌های ثبت‌شده" className="space-y-4">
      {/* Copy Meal from Yesterday or Any Recent Logged Day */}
      {repeatableMealsFromSource.length > 0 && (
        <div className="card-surface rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>کپی سریع وعده از {formatCopyDayLabel(activeCopySourceDay)}</span>
            </div>

            {availableCopyDates.length > 1 && (
              <select
                aria-label="انتخاب روز مبدا برای کپی وعده"
                data-testid="copy-source-date-select"
                value={activeCopySourceDay}
                onChange={(e) => setCustomSourceDay(e.target.value)}
                className="rounded-lg bg-[#1E1E22] border border-[#2E2E36] text-[11px] text-zinc-300 px-2 py-1 focus:outline-none focus:border-emerald-500/70"
              >
                {availableCopyDates.map((dk) => (
                  <option key={dk} value={dk}>
                    {formatCopyDayLabel(dk)} — {formatJalaliDate(dateFromKey(dk), 'medium')}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {repeatableMealsFromSource.map((group) => (
              <button
                key={group.mealType}
                type="button"
                onClick={() => onRepeatEntries(group.items, group.mealType)}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#1E1E22] hover:bg-[#26262C] border border-[#2C2C33] px-3 py-2 text-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-zinc-100">
                  کپی {mealLabels[group.mealType]}
                </span>
                <span className="text-zinc-400 tabular-nums-fa">
                  ({formatFaNumber(group.totalKcal)} کالری)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today's Grouped Meals */}
      {!hasAnyToday ? (
        <div className="card-surface rounded-2xl p-7 text-center">
          <div className="w-11 h-11 rounded-2xl bg-[#1E1E22] border border-[#2A2A30] flex items-center justify-center mx-auto mb-3 text-zinc-400">
            <Sun className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">هنوز وعده‌ای ثبت نشده است</h3>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
            در کادر بالا غذای خود را به فارسی تایپ کنید، صوتی بگویید یا یکی از پیشنهادهای سریع را
            لمس کنید.
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="logged-meals-list">
          {mealTypes.map((mealType) => {
            const items = groupedToday[mealType]
            if (items.length === 0) return null

            const Icon = MEAL_ICONS[mealType]
            const subtotalKcal = items.reduce((sum, item) => sum + item.kcal, 0)
            const subtotalProtein =
              Math.round(items.reduce((sum, item) => sum + item.protein, 0) * 10) / 10
            const suggestedMealBudget = Math.round(goals.dailyKcal * budgetRatios[mealType])
            const isNamingTemplate = savingTemplateFor === mealType

            return (
              <div
                key={mealType}
                data-testid={`meal-group-${mealType}`}
                className="card-surface rounded-2xl overflow-hidden animate-fade-up"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[#222227]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#1E1E22] flex items-center justify-center text-zinc-300">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-zinc-100 leading-tight">
                          {mealLabels[mealType]}
                        </h3>
                        <span
                          data-testid={`meal-protein-badge-${mealType}`}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-500/12 text-sky-400 tabular-nums-fa"
                        >
                          پروتئین {formatFaNumber(subtotalProtein, 1)}گ
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 tabular-nums-fa">
                        {formatFaNumber(items.length)} مورد · سهم پیشنهادی ~
                        {formatFaNumber(suggestedMealBudget)} کالری
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-400 tabular-nums-fa ml-1">
                      {formatFaNumber(subtotalKcal)} کالری
                    </span>
                    <button
                      type="button"
                      data-testid={`save-template-trigger-${mealType}`}
                      onClick={() => {
                        setSavingTemplateFor((curr) => (curr === mealType ? null : mealType))
                        setTemplateName(
                          `${mealLabels[mealType]} ${items[0]?.foodName ?? ''}`.trim(),
                        )
                      }}
                      title="ذخیره به عنوان وعده منتخب"
                      className="inline-flex items-center gap-1 rounded-lg bg-[#1E1E22] hover:bg-[#28282F] border border-[#2B2B32] px-2 py-1 text-[11px] text-zinc-300 hover:text-amber-300 transition-colors"
                    >
                      <BookmarkPlus className="w-3 h-3" />
                      <span className="hidden sm:inline">منتخب</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRepeatEntries(items, mealType)}
                      title={`تکرار ${mealLabels[mealType]}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#1E1E22] hover:bg-[#28282F] border border-[#2B2B32] px-2 py-1 text-[11px] text-zinc-300 hover:text-emerald-300 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>تکرار</span>
                    </button>
                  </div>
                </div>

                {isNamingTemplate && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!templateName.trim()) return
                      onSaveTemplate(templateName.trim(), mealType, items)
                      setSavingTemplateFor(null)
                      setTemplateName('')
                    }}
                    className="px-4 py-2.5 bg-[#121215] border-b border-[#222227] flex items-center gap-2 animate-fade-up"
                  >
                    <input
                      type="text"
                      data-testid="template-name-input"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      aria-label="نام قالب وعده"
                      placeholder="نام قالب وعده (مثلاً: ناهار قورمه)"
                      className="flex-1 min-w-0 rounded-lg bg-[#0C0C0D] border border-[#2E2E35] focus:border-emerald-500/70 focus:outline-none px-2.5 py-1.5 text-xs text-zinc-100"
                    />
                    <button
                      type="submit"
                      data-testid="confirm-save-template-btn"
                      className="rounded-lg bg-emerald-500 text-[#051B11] font-bold text-xs px-3 py-1.5 shrink-0"
                    >
                      ذخیره
                    </button>
                  </form>
                )}

                <ul className="divide-y divide-[#1F1F24]">
                  {items.map((entry) => {
                    const isEditing = editingEntryId === entry.id
                    const matchedFood = foodById.get(entry.foodId)
                    const unitOptions = buildEditableUnitOptions(matchedFood, entry)

                    return (
                      <li
                        key={entry.id}
                        data-testid="logged-meal-item"
                        className="px-4 py-3 hover:bg-[#1B1B1E] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-zinc-100 truncate">
                                {entry.foodName}
                              </span>
                              <span className="text-[11px] text-zinc-400 shrink-0 tabular-nums-fa">
                                {formatQuantityFa(entry.quantity)} {entry.unit}
                              </span>
                              {entry.modifierLabel && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-300">
                                  {entry.modifierLabel}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-zinc-400 mt-0.5 tabular-nums-fa">
                              <span>{formatFaNumber(entry.totalGrams)} گرم</span>
                              <span className="text-sky-400/90">
                                پ {formatFaNumber(entry.protein, 1)}گ
                              </span>
                              <span className="text-amber-400/90">
                                ک {formatFaNumber(entry.carbs, 1)}گ
                              </span>
                              <span className="text-rose-400/90">
                                چ {formatFaNumber(entry.fat, 1)}گ
                              </span>
                              {(entry.fiber ?? 0) > 0 && (
                                <span className="text-lime-400/90">
                                  ف {formatFaNumber(entry.fiber ?? 0, 1)}گ
                                </span>
                              )}
                              <span className="text-zinc-500">{formatTimeFa(entry.timestamp)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-sm font-semibold text-zinc-200 tabular-nums-fa ml-1">
                              {formatFaNumber(entry.kcal)}
                              <span className="text-[10px] text-zinc-400 font-normal mr-1">
                                کالری
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingEntryId((curr) => (curr === entry.id ? null : entry.id))
                              }
                              aria-label={`ویرایش ${entry.foodName}`}
                              data-testid="edit-meal-item-btn"
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                isEditing
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#25252B]'
                              }`}
                            >
                              {isEditing ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Edit3 className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) setEditingEntryId(null)
                                onDeleteEntry(entry.id)
                              }}
                              aria-label={`حذف ${entry.foodName}`}
                              data-testid="delete-meal-item-btn"
                              className="w-8 h-8 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/12 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div
                            data-testid="inline-entry-editor"
                            className="mt-2.5 pt-2.5 border-t border-[#26262C] flex flex-wrap items-center justify-between gap-2.5 animate-fade-up"
                          >
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="text-[11px] text-zinc-400">مقدار:</span>
                              <button
                                type="button"
                                onClick={() => handleStepEntryQty(entry, 1)}
                                aria-label="افزایش مقدار"
                                className="w-7 h-7 rounded-lg bg-[#25252C] hover:bg-[#31313A] text-zinc-200 flex items-center justify-center"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                inputMode="decimal"
                                aria-label={`مقدار ${entry.foodName} به ${entry.unit}`}
                                data-testid="inline-entry-quantity-input"
                                value={entry.quantity}
                                min={isWeightUnit(entry.unit) ? 0.1 : 0.25}
                                step={isWeightUnit(entry.unit) ? 1 : 0.25}
                                onChange={(e) => {
                                  const nextQty = parseEditableQuantity(e.target.value)
                                  if (nextQty !== null) onUpdateEntry(entry.id, { quantity: nextQty })
                                }}
                                className="w-16 rounded-lg bg-[#25252C] border border-[#35353F] text-zinc-100 text-xs px-2 py-1 text-center tabular-nums-fa focus:outline-none focus:border-emerald-500/70"
                              />
                              <button
                                type="button"
                                onClick={() => handleStepEntryQty(entry, -1)}
                                aria-label="کاهش مقدار"
                                className="w-7 h-7 rounded-lg bg-[#25252C] hover:bg-[#31313A] text-zinc-200 flex items-center justify-center"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>

                              {unitOptions && unitOptions.length > 1 && (
                                <select
                                  aria-label={`تغییر واحد ${entry.foodName}`}
                                  data-testid="inline-entry-unit-select"
                                  value={entry.unit}
                                  onChange={(e) =>
                                    onUpdateEntry(entry.id, { unit: e.target.value })
                                  }
                                  className="rounded-lg bg-[#25252C] border border-[#35353F] text-zinc-100 text-xs px-2 py-1 focus:outline-none focus:border-emerald-500/70"
                                >
                                  {unitOptions.map((u) => (
                                    <option key={u.name} value={u.name}>
                                      {u.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {mealTypes.map((mt) => (
                                <button
                                  key={mt}
                                  type="button"
                                  onClick={() => onUpdateEntry(entry.id, { mealType: mt })}
                                  className={`px-2 py-1 rounded-lg text-[11px] transition-colors ${
                                    entry.mealType === mt
                                      ? 'bg-emerald-500/18 text-emerald-300 font-semibold'
                                      : 'bg-[#222228] text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  {mealLabels[mt]}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
