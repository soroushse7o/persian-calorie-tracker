import { Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  FOOD_CATEGORY_LABELS,
  type FoodCategory,
  type FoodItem,
  type RecipeIngredientRecord,
} from '../../types/nutrition'
import { calculateFoodMacros, matchesFoodSearch } from '../../utils/persianFoodParser'
import { formatFaNumber } from '../../utils/persianFormat'
import {
  CATEGORY_ORDER,
  parsePositiveNum,
  type RecipeIngredientDraft,
} from './foodFormHelpers'

interface RecipeBuilderFormProps {
  foods: FoodItem[]
  foodById: Map<string, FoodItem>
  editingRecipe?: FoodItem | null
  formError: string | null
  setFormError: (err: string | null) => void
  onAddFood: (food: Omit<FoodItem, 'id'>) => void
  onUpdateFood: (food: FoodItem) => void
  onClose: () => void
}

export function RecipeBuilderForm({
  foods,
  foodById,
  editingRecipe = null,
  formError,
  setFormError,
  onAddFood,
  onUpdateFood,
  onClose,
}: RecipeBuilderFormProps) {
  const [recipeName, setRecipeName] = useState(() => editingRecipe?.name ?? '')
  const [recipeUnitName, setRecipeUnitName] = useState(
    () => editingRecipe?.defaultUnit ?? 'پرس',
  )
  const [recipeServings, setRecipeServings] = useState('2')
  const [cookingYieldPct, setCookingYieldPct] = useState(() =>
    String(editingRecipe?.cookingYieldPct ?? 88),
  )
  const [recipeCategory, setRecipeCategory] = useState<FoodCategory>(
    () => editingRecipe?.category ?? 'stews_mains',
  )
  const [recipeSearch, setRecipeSearch] = useState('')
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredientDraft[]>(() =>
    editingRecipe?.recipeIngredients
      ? editingRecipe.recipeIngredients.map((r) => ({
          foodId: r.foodId,
          quantity: String(r.quantity),
          unit: r.unit,
        }))
      : [],
  )

  const recipeCandidateFoods = useMemo(() => {
    if (!recipeSearch.trim()) return foods.slice(0, 8)
    return foods.filter((f) => matchesFoodSearch(f, recipeSearch)).slice(0, 8)
  }, [foods, recipeSearch])

  const recipeTotals = useMemo(() => {
    let rawTotalGrams = 0
    let kcal = 0
    let protein = 0
    let carbs = 0
    let fat = 0
    let fiber = 0
    const microSum = {
      ironMg: 0,
      calciumMg: 0,
      potassiumMg: 0,
      magnesiumMg: 0,
      zincMg: 0,
      sodiumMg: 0,
      vitaminCMg: 0,
      vitaminDMcg: 0,
      vitaminB12Mcg: 0,
      vitaminAMcg: 0,
    }

    for (const ing of recipeIngredients) {
      const f = foodById.get(ing.foodId)
      if (!f) continue
      const u = f.units.find((unit) => unit.name === ing.unit) ?? f.units[0]
      const qty = parsePositiveNum(ing.quantity, 1)
      const calc = calculateFoodMacros(f, qty, u.grams)
      rawTotalGrams += calc.totalGrams
      kcal += calc.kcal
      protein += calc.protein
      carbs += calc.carbs
      fat += calc.fat
      fiber += calc.fiber
      for (const k of Object.keys(microSum) as Array<keyof typeof microSum>) {
        microSum[k] += calc.micronutrients[k] ?? 0
      }
    }

    const yieldPct = Math.max(25, Math.min(400, parsePositiveNum(cookingYieldPct, 100)))
    const cookedTotalGrams = rawTotalGrams * (yieldPct / 100)
    const servings = Math.max(1, parsePositiveNum(recipeServings, 1))
    const gramsPerServing = Math.max(10, Math.round(cookedTotalGrams / servings))

    return {
      rawTotalGrams: Math.round(rawTotalGrams),
      cookedTotalGrams: Math.round(cookedTotalGrams),
      yieldPct: Math.round(yieldPct),
      kcal: Math.round(kcal),
      perServingKcal: Math.round(kcal / servings),
      gramsPerServing,
      per100g:
        cookedTotalGrams > 0
          ? {
              kcal: Math.round((kcal / cookedTotalGrams) * 1000) / 10,
              protein: Math.round((protein / cookedTotalGrams) * 1000) / 10,
              carbs: Math.round((carbs / cookedTotalGrams) * 1000) / 10,
              fat: Math.round((fat / cookedTotalGrams) * 1000) / 10,
              fiber: Math.round((fiber / cookedTotalGrams) * 1000) / 10,
              micronutrients: {
                ironMg: Math.round((microSum.ironMg / cookedTotalGrams) * 1000) / 10,
                calciumMg: Math.round((microSum.calciumMg / cookedTotalGrams) * 100),
                potassiumMg: Math.round((microSum.potassiumMg / cookedTotalGrams) * 100),
                magnesiumMg: Math.round((microSum.magnesiumMg / cookedTotalGrams) * 100),
                zincMg: Math.round((microSum.zincMg / cookedTotalGrams) * 1000) / 10,
                sodiumMg: Math.round((microSum.sodiumMg / cookedTotalGrams) * 100),
                vitaminCMg: Math.round((microSum.vitaminCMg / cookedTotalGrams) * 100),
                vitaminDMcg: Math.round((microSum.vitaminDMcg / cookedTotalGrams) * 1000) / 10,
                vitaminB12Mcg: Math.round((microSum.vitaminB12Mcg / cookedTotalGrams) * 1000) / 10,
                vitaminAMcg: Math.round((microSum.vitaminAMcg / cookedTotalGrams) * 100),
              },
            }
          : { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    }
  }, [cookingYieldPct, foodById, recipeIngredients, recipeServings])

  const handleSubmitRecipe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipeName.trim()) {
      setFormError('لطفاً نام دستور پخت را وارد کنید.')
      return
    }
    if (recipeIngredients.length < 2 || recipeTotals.cookedTotalGrams <= 0) {
      setFormError('حداقل ۲ ماده غذایی برای ساخت دستور پخت ترکیبی انتخاب کنید.')
      return
    }
    const cleanUnit = recipeUnitName.trim() || 'پرس'
    const savedIngredients: RecipeIngredientRecord[] = recipeIngredients.map((ing) => ({
      foodId: ing.foodId,
      quantity: parsePositiveNum(ing.quantity, 1),
      unit: ing.unit,
    }))

    const payload: Omit<FoodItem, 'id'> = {
      name: recipeName.trim(),
      aliases: editingRecipe?.aliases ?? [],
      category: recipeCategory,
      per100g: recipeTotals.per100g,
      defaultUnit: cleanUnit,
      units: [
        { name: cleanUnit, grams: recipeTotals.gramsPerServing },
        { name: 'گرم', grams: 1 },
      ],
      isCustom: true,
      isRecipe: true,
      recipeIngredients: savedIngredients,
      cookingYieldPct: recipeTotals.yieldPct,
    }

    if (editingRecipe) {
      onUpdateFood({ ...payload, id: editingRecipe.id })
    } else {
      onAddFood(payload)
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmitRecipe} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="recipe-name-input" className="block text-xs text-zinc-300 mb-1.5">
            نام دستور پخت *
          </label>
          <input
            id="recipe-name-input"
            type="text"
            required
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="مثلاً: خوراک مرغ و سبزیجات خانگی"
            className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label htmlFor="recipe-category-select" className="block text-xs text-zinc-300 mb-1.5">
            دسته‌بندی
          </label>
          <select
            id="recipe-category-select"
            value={recipeCategory}
            onChange={(e) => setRecipeCategory(e.target.value as FoodCategory)}
            className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] px-3 py-2 text-sm text-zinc-100"
          >
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {FOOD_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div>
          <label htmlFor="recipe-unit-input" className="block text-xs text-zinc-300 mb-1.5">
            واحد خروجی
          </label>
          <input
            id="recipe-unit-input"
            type="text"
            value={recipeUnitName}
            onChange={(e) => setRecipeUnitName(e.target.value)}
            placeholder="پرس / کاسه"
            className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] px-2.5 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label htmlFor="recipe-servings-input" className="block text-xs text-zinc-300 mb-1.5">
            تعداد واحد
          </label>
          <input
            id="recipe-servings-input"
            type="text"
            inputMode="numeric"
            value={recipeServings}
            onChange={(e) => setRecipeServings(e.target.value)}
            className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] px-2.5 py-2 text-sm text-zinc-100 tabular-nums-fa"
          />
        </div>
        <div>
          <label
            htmlFor="recipe-yield-input"
            className="block text-xs text-amber-300 mb-1.5"
            title="نسبت وزن غذای پخته به وزن مواد خام (مثلاً ۸۵٪ به علت تبخیر آب)"
          >
            ضریب پخت (٪)
          </label>
          <input
            id="recipe-yield-input"
            type="text"
            inputMode="numeric"
            value={cookingYieldPct}
            onChange={(e) => setCookingYieldPct(e.target.value)}
            className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] px-2.5 py-2 text-sm text-zinc-100 tabular-nums-fa"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="recipe-ingredient-search" className="block text-xs text-zinc-300">
          جستجو و افزودن مواد اولیه
        </label>
        <input
          id="recipe-ingredient-search"
          type="text"
          value={recipeSearch}
          onChange={(e) => setRecipeSearch(e.target.value)}
          placeholder="نام ماده غذایی را بنویسید (مثلاً: سینه مرغ، روغن زیتون، سیب‌زمینی...)"
          className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] px-3 py-2 text-xs sm:text-sm text-zinc-100"
        />
        <div className="flex flex-wrap gap-1.5">
          {recipeCandidateFoods.map((cand) => (
            <button
              key={cand.id}
              type="button"
              onClick={() =>
                setRecipeIngredients((prev) => [
                  ...prev,
                  { foodId: cand.id, quantity: '1', unit: cand.defaultUnit },
                ])
              }
              className="rounded-lg bg-[#1E1E22] hover:bg-emerald-500/15 border border-[#2E2E35] px-2.5 py-1 text-[11px] text-zinc-200 hover:text-emerald-300"
            >
              + {cand.name}
            </button>
          ))}
        </div>
      </div>

      {recipeIngredients.length > 0 && (
        <div className="space-y-2">
          {recipeIngredients.map((ing, idx) => {
            const f = foodById.get(ing.foodId)
            if (!f) return null
            return (
              <div
                key={`${ing.foodId}-${idx}`}
                className="flex items-center gap-2 rounded-xl bg-[#1E1E22] p-2 text-xs"
              >
                <span className="flex-1 font-medium text-zinc-100 truncate">{f.name}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={`مقدار ${f.name}`}
                  value={ing.quantity}
                  onChange={(e) =>
                    setRecipeIngredients((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, quantity: e.target.value } : item,
                      ),
                    )
                  }
                  className="w-14 rounded-lg bg-[#0C0C0D] border border-[#2E2E35] px-2 py-1 text-center text-zinc-100 tabular-nums-fa"
                />
                <select
                  aria-label={`واحد ${f.name}`}
                  value={ing.unit}
                  onChange={(e) =>
                    setRecipeIngredients((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, unit: e.target.value } : item)),
                    )
                  }
                  className="rounded-lg bg-[#0C0C0D] border border-[#2E2E35] px-2 py-1 text-zinc-200"
                >
                  {f.units.map((u) => (
                    <option key={u.name} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`حذف ${f.name}`}
                  onClick={() =>
                    setRecipeIngredients((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="text-zinc-400 hover:text-rose-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {recipeTotals.cookedTotalGrams > 0 && (
        <div className="card-elevated rounded-xl p-3 text-xs tabular-nums-fa space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">
              هر ۱ {recipeUnitName || 'پرس'} (~{formatFaNumber(recipeTotals.gramsPerServing)} گرم پس
              از پخت):
            </span>
            <span className="font-bold text-emerald-400">
              ~{formatFaNumber(recipeTotals.perServingKcal)} کالری
            </span>
          </div>
          <div className="text-[11px] text-zinc-500">
            وزن خام کل: {formatFaNumber(recipeTotals.rawTotalGrams)}گ ← وزن پخته (
            {formatFaNumber(recipeTotals.yieldPct)}٪): {formatFaNumber(recipeTotals.cookedTotalGrams)}گ
          </div>
        </div>
      )}

      {formError && (
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
          {formError}
        </p>
      )}

      <div className="flex items-center gap-2.5 pt-2">
        <button
          type="submit"
          id="save-recipe-submit-btn"
          className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-sm py-2.5 transition-colors"
        >
          {editingRecipe ? 'ذخیره ویرایش دستور پخت' : 'ذخیره دستور پخت در بانک غذا'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-[#222228] hover:bg-[#2C2C34] text-zinc-300 text-sm font-medium px-4 py-2.5 transition-colors"
        >
          انصراف
        </button>
      </div>
    </form>
  )
}
