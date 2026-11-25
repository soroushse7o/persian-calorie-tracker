import { Plus, Star, X } from 'lucide-react'
import { useState } from 'react'
import {
  getMealTypeLabels,
  getMealTypes,
  type FoodItem,
  type MealType,
  type UserGoals,
} from '../../types/nutrition'

interface MealCustomizationSectionProps {
  goals: UserGoals
  foods: FoodItem[]
  onUpdateGoals: (goals: UserGoals) => void
}

export function MealCustomizationSection({
  goals,
  foods,
  onUpdateGoals,
}: MealCustomizationSectionProps) {
  const [foodToAdd, setFoodToAdd] = useState('')
  const extraCount = Math.max(0, Math.min(2, goals.extraSnackCount ?? 0))
  const mealTypes = getMealTypes(extraCount)
  const labels = getMealTypeLabels(goals.scheduleMode, goals.customMealLabels)
  const favorites = goals.quickFavorites ?? []

  const setLabel = (type: MealType, value: string) => {
    onUpdateGoals({
      ...goals,
      customMealLabels: { ...goals.customMealLabels, [type]: value },
    })
  }

  const addFavorite = (id: string) => {
    if (!id || favorites.includes(id)) return
    onUpdateGoals({ ...goals, quickFavorites: [...favorites, id].slice(0, 100) })
    setFoodToAdd('')
  }

  const removeFavorite = (id: string) => {
    onUpdateGoals({ ...goals, quickFavorites: favorites.filter((f) => f !== id) })
  }

  return (
    <section id="meal-customization-section" className="card-surface rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/12 flex items-center justify-center text-amber-400">
          <Star className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-zinc-100">شخصی\u200cسازی وعده‌ها و میان\u200cوعدهها</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            نام وعدهها را خودتان تعیین کنید و تا دو میان\u200cوعده اضافه به ثبت سریع اضافه نمایید.
          </p>
        </div>
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-zinc-300">تعداد میان\u200cوعدههای اضافی:</span>
          <select
            aria-label="تعداد میانوعدههای اضافی"
            value={extraCount}
            onChange={(e) =>
              onUpdateGoals({ ...goals, extraSnackCount: Number(e.target.value) })
            }
            className="rounded-lg bg-[#1E1E22] border border-[#2E2E35] text-zinc-100 text-xs px-2 py-1.5"
          >
            <option value={0}> فقط میان\u200cوعده معمولی</option>
            <option value={1}> میان\u200cوعده دوم</option>
            <option value={2}> میان\u200cوعده دوم و سوم</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <span className="block text-zinc-300">نام وعدهها (جایگزین برچسب حالت برنامه):</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {mealTypes.map((type) => (
              <label key={type} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-[11px] text-zinc-400">{labels[type]}</span>
                <input
                  type="text"
                  aria-label={`نام وعده ${type}`}
                  value={goals.customMealLabels?.[type] ?? ''}
                  placeholder={labels[type]}
                  onChange={(e) => setLabel(type, e.target.value)}
                  className="flex-1 min-w-0 rounded-lg bg-[#1E1E22] border border-[#2E2E35] px-2 py-1.5 text-xs text-zinc-100"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-[#26262A] pt-2.5">
          <span className="block text-zinc-300">لیست شخصی محصولات پراستفاده (جدا از اخیر و نمونهها):</span>
          <div className="flex items-center gap-2">
            <select
              aria-label="افزودن محصول به لیست شخصی"
              value={foodToAdd}
              onChange={(e) => addFavorite(e.target.value)}
              className="flex-1 min-w-0 rounded-lg bg-[#1E1E22] border border-[#2E2E35] text-zinc-100 text-xs px-2 py-1.5"
            >
              <option value="">یک محصول انتخاب کنید…</option>
              {foods.map((food) => (
                <option key={food.id} value={food.id} disabled={favorites.includes(food.id)}>
                  {food.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {favorites.length === 0 && (
              <span className="text-[11px] text-zinc-500">هنوز محصولی اضافه نکردهاید.</span>
            )}
            {favorites.map((id) => {
              const food = foods.find((f) => f.id === id)
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 text-[11px] text-emerald-200"
                >
                  <Plus className="w-3 h-3" />
                  {food?.name ?? id}
                  <button
                    type="button"
                    aria-label={`حذف ${food?.name ?? id} از لیست شخصی`}
                    onClick={() => removeFavorite(id)}
                    className="text-zinc-400 hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
