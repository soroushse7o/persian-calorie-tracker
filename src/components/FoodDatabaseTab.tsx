import { ChefHat, ExternalLink, Info, Plus, Search, Sparkles, Utensils, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildMissingFoodIssueUrl } from '../config/feedback'
import { CATALOG_VERSION, NUTRITION_DATA_SOURCES } from '../data/iranianFoods'
import { useFocusTrap } from '../hooks/useFocusTrap'
import {
  FOOD_CATEGORY_LABELS,
  MICRONUTRIENT_SPECS,
  type FoodItem,
  type MicronutrientKey,
} from '../types/nutrition'
import { matchesFoodSearch } from '../utils/persianFoodParser'
import { formatFaNumber } from '../utils/persianFormat'
import { FoodCard } from './foodDatabase/FoodCard'
import {
  CATEGORY_ORDER,
  createEmptyForm,
  createFormFromFood,
  type CategoryFilter,
  type FoodFormState,
  type ModalMode,
} from './foodDatabase/foodFormHelpers'
import { RecipeBuilderForm } from './foodDatabase/RecipeBuilderForm'
import { SingleFoodForm } from './foodDatabase/SingleFoodForm'

export type NutrientSmartFilter = 'none' | 'high_protein' | 'low_kcal' | 'high_fiber' | MicronutrientKey

const NUTRIENT_SMART_FILTERS: ReadonlyArray<{ id: NutrientSmartFilter; label: string }> = [
  { id: 'none', label: 'ترتیب پیش‌فرض' },
  { id: 'high_protein', label: 'پروتئین بالا' },
  { id: 'high_fiber', label: 'فیبر بالا' },
  { id: 'ironMg', label: 'غنی از آهن' },
  { id: 'calciumMg', label: 'غنی از کلسیم' },
  { id: 'potassiumMg', label: 'غنی از پتاسیم' },
  { id: 'vitaminCMg', label: 'غنی از ویتامین C' },
  { id: 'vitaminDMcg', label: 'غنی از ویتامین D' },
  { id: 'sodiumMg', label: 'کم‌سدیم (کم‌نمک)' },
  { id: 'low_kcal', label: 'کم‌کالری' },
]

interface FoodDatabaseTabProps {
  foods: FoodItem[]
  prefillNewFoodName: string | null
  prefillNewFoodBarcode?: string | null
  initialNutrientFilter?: NutrientSmartFilter | null
  onConsumePrefillName: () => void
  onConsumeNutrientFilter?: () => void
  onAddFood: (food: Omit<FoodItem, 'id'>) => void
  onUpdateFood: (food: FoodItem) => void
  onDeleteFood: (id: string) => void
  onRevertFoodOverride?: (id: string) => void
  onQuickUseFood: (food: FoodItem) => void
}

export function FoodDatabaseTab({
  foods,
  prefillNewFoodName,
  prefillNewFoodBarcode = null,
  initialNutrientFilter = null,
  onConsumePrefillName,
  onConsumeNutrientFilter,
  onAddFood,
  onUpdateFood,
  onDeleteFood,
  onRevertFoodOverride,
  onQuickUseFood,
}: FoodDatabaseTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [nutrientFilter, setNutrientFilter] = useState<NutrientSmartFilter>(
    () => initialNutrientFilter ?? 'none',
  )
  const [prevInitialNutrient, setPrevInitialNutrient] = useState(initialNutrientFilter)
  const [visibleLimit, setVisibleLimit] = useState(60)
  const prefillSig = `${prefillNewFoodName ?? ''}::${prefillNewFoodBarcode ?? ''}`
  const [prevPrefillSig, setPrevPrefillSig] = useState(prefillSig)
  const [formOpen, setFormOpen] = useState(
    () => Boolean(prefillNewFoodName) || Boolean(prefillNewFoodBarcode),
  )
  const [modalMode, setModalMode] = useState<ModalMode>('single')
  const [editingRecipe, setEditingRecipe] = useState<FoodItem | null>(null)
  const [formState, setFormState] = useState<FoodFormState>(() =>
    createEmptyForm(prefillNewFoodName ?? '', prefillNewFoodBarcode ?? ''),
  )
  const [formError, setFormError] = useState<string | null>(null)

  if (prevInitialNutrient !== initialNutrientFilter) {
    setPrevInitialNutrient(initialNutrientFilter)
    if (initialNutrientFilter) {
      setNutrientFilter(initialNutrientFilter)
      setCategoryFilter('all')
    }
  }

  if (prevPrefillSig !== prefillSig) {
    setPrevPrefillSig(prefillSig)
    if (prefillNewFoodName || prefillNewFoodBarcode) {
      setModalMode('single')
      setEditingRecipe(null)
      setFormState(createEmptyForm(prefillNewFoodName ?? '', prefillNewFoodBarcode ?? ''))
      setFormError(null)
      setFormOpen(true)
    }
  }

  const selectCategory = (next: CategoryFilter) => {
    setCategoryFilter(next)
    setVisibleLimit(60)
  }

  const selectNutrientFilter = (next: NutrientSmartFilter) => {
    setNutrientFilter(next)
    setVisibleLimit(60)
    if (initialNutrientFilter) {
      onConsumeNutrientFilter?.()
    }
  }

  const modalContainerRef = useRef<HTMLDivElement | null>(null)
  const foodById = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setFormError(null)
    setEditingRecipe(null)
    if (prefillNewFoodName || prefillNewFoodBarcode) {
      onConsumePrefillName()
    }
  }, [onConsumePrefillName, prefillNewFoodBarcode, prefillNewFoodName])

  useFocusTrap(modalContainerRef, formOpen, closeForm)

  const filteredFoods = useMemo(() => {
    const base = foods.filter((food) => {
      if (categoryFilter === 'custom' && !food.isCustom && !food.isOverridden) return false
      if (categoryFilter === 'verified' && !food.verified) return false
      if (
        categoryFilter !== 'all' &&
        categoryFilter !== 'custom' &&
        categoryFilter !== 'verified' &&
        food.category !== categoryFilter
      ) {
        return false
      }
      if (nutrientFilter === 'high_protein' && food.per100g.protein < 10) return false
      if (nutrientFilter === 'high_fiber' && (food.per100g.fiber ?? 0) < 3) return false
      if (nutrientFilter === 'low_kcal' && (food.per100g.kcal > 110 || food.per100g.kcal <= 5)) {
        return false
      }
      if (nutrientFilter === 'sodiumMg') {
        const na = food.per100g.micronutrients?.sodiumMg ?? 0
        if (na > 140 || food.per100g.kcal <= 5) return false
      } else if (
        nutrientFilter !== 'none' &&
        nutrientFilter !== 'high_protein' &&
        nutrientFilter !== 'high_fiber' &&
        nutrientFilter !== 'low_kcal'
      ) {
        const spec = MICRONUTRIENT_SPECS.find((s) => s.key === nutrientFilter)
        const val = food.per100g.micronutrients?.[nutrientFilter] ?? 0
        if (!spec || val < spec.dailyRef * 0.08) return false
      }

      if (searchQuery.trim() && food.barcode?.includes(searchQuery.trim())) {
        return true
      }
      return matchesFoodSearch(food, searchQuery)
    })

    if (nutrientFilter === 'none') return base

    return [...base].sort((a, b) => {
      if (nutrientFilter === 'high_protein') return b.per100g.protein - a.per100g.protein
      if (nutrientFilter === 'high_fiber') return (b.per100g.fiber ?? 0) - (a.per100g.fiber ?? 0)
      if (nutrientFilter === 'low_kcal') return a.per100g.kcal - b.per100g.kcal
      if (nutrientFilter === 'sodiumMg') {
        return (
          (a.per100g.micronutrients?.sodiumMg ?? 0) - (b.per100g.micronutrients?.sodiumMg ?? 0)
        )
      }
      return (
        (b.per100g.micronutrients?.[nutrientFilter] ?? 0) -
        (a.per100g.micronutrients?.[nutrientFilter] ?? 0)
      )
    })
  }, [foods, categoryFilter, nutrientFilter, searchQuery])

  const displayedFoods = useMemo(
    () => (searchQuery.trim() ? filteredFoods : filteredFoods.slice(0, visibleLimit)),
    [filteredFoods, searchQuery, visibleLimit],
  )

  const userLayerCount = useMemo(
    () => foods.filter((f) => f.isCustom || f.isOverridden).length,
    [foods],
  )
  const verifiedCount = useMemo(() => foods.filter((f) => f.verified).length, [foods])

  const openNewFoodForm = (mode: ModalMode = 'single') => {
    setModalMode(mode)
    setEditingRecipe(null)
    setFormState(createEmptyForm())
    setFormError(null)
    setFormOpen(true)
  }

  const openEditFoodForm = (food: FoodItem) => {
    if (food.isRecipe && food.recipeIngredients && food.recipeIngredients.length > 0) {
      setModalMode('recipe')
      setEditingRecipe(food)
      setFormError(null)
      setFormOpen(true)
      return
    }
    setModalMode('single')
    setEditingRecipe(null)
    setFormState(createFormFromFood(food))
    setFormError(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4 animate-fade-up" data-testid="food-database-tab">
      <div className="card-surface rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-zinc-100">بانک غذاهای ایرانی</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1E1E22] text-zinc-400">
                نسخه کاتالوگ {CATALOG_VERSION}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 tabular-nums-fa">
              {formatFaNumber(foods.length)} غذا ({formatFaNumber(verifiedCount)} مورد تطبیق‌یافته با
              منبع مرجع) — دارای فیلتر هوشمند درشت‌مغذی و ریزمغزی‌ها
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="add-recipe-btn"
              onClick={() => openNewFoodForm('recipe')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#282830] border border-[#2E2E36] text-zinc-200 font-semibold text-xs px-3 py-2.5 transition-colors"
            >
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span>دستور پخت</span>
            </button>
            <button
              type="button"
              id="add-custom-food-btn"
              onClick={() => openNewFoodForm('single')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-xs sm:text-sm px-3.5 py-2.5 transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>افزودن غذای جدید</span>
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-[#0C0C0D] border border-[#24242A] px-3 py-2 text-[11px] text-zinc-400">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
          <span>{NUTRITION_DATA_SOURCES.shortNotice}</span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            id="food-db-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="جستجوی غذاها"
            placeholder="جستجوی نام غذا، واحد یا بارکد (مثلاً: قورمه‌سبزی، سنگک، ساقه‌طلایی، 626...)"
            className="w-full rounded-xl bg-[#0C0C0D] border border-[#2A2A30] focus:border-emerald-500/70 focus:outline-none pr-10 pl-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => selectCategory('all')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-zinc-100 text-[#0C0C0D] font-semibold'
                : 'bg-[#1E1E22] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            همه ({formatFaNumber(foods.length)})
          </button>

          <button
            type="button"
            onClick={() => selectCategory('verified')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              categoryFilter === 'verified'
                ? 'bg-emerald-500 text-[#051B11] font-semibold'
                : 'bg-[#1E1E22] text-emerald-300 hover:bg-[#27272E]'
            }`}
          >
            منبع مرجع ({formatFaNumber(verifiedCount)})
          </button>

          {userLayerCount > 0 && (
            <button
              type="button"
              onClick={() => selectCategory('custom')}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                categoryFilter === 'custom'
                  ? 'bg-sky-500 text-[#041824] font-semibold'
                  : 'bg-[#1E1E22] text-sky-300 hover:bg-[#27272E]'
              }`}
            >
              شخصی و ویرایش‌ها ({formatFaNumber(userLayerCount)})
            </button>
          )}

          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => selectCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-zinc-100 text-[#0C0C0D] font-semibold'
                  : 'bg-[#1E1E22] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {FOOD_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Nutritional Goal & Micronutrient Smart Filter Strip */}
        <div
          data-testid="food-nutrient-filter-bar"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-[#23232A]"
        >
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-zinc-400 ml-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>فیلتر تغذیه‌ای:</span>
          </span>
          {NUTRIENT_SMART_FILTERS.map((nf) => {
            const active = nutrientFilter === nf.id
            const labelText =
              nf.id !== 'none' &&
              nf.id !== 'high_protein' &&
              nf.id !== 'high_fiber' &&
              nf.id !== 'low_kcal' &&
              nf.id !== 'sodiumMg' &&
              !NUTRIENT_SMART_FILTERS.some((x) => x.id === nf.id)
                ? nf.id
                : nf.label
            return (
              <button
                key={nf.id}
                type="button"
                data-testid={`nutrient-filter-${nf.id}`}
                onClick={() => selectNutrientFilter(nf.id)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  active
                    ? 'bg-emerald-500 text-[#051B11] font-bold'
                    : 'bg-[#0C0C0D] border border-[#282830] text-zinc-300 hover:border-emerald-500/40'
                }`}
              >
                {labelText}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5" data-testid="food-db-list">
        {displayedFoods.map((food) => (
          <FoodCard
            key={food.id}
            food={food}
            onQuickUse={onQuickUseFood}
            onEdit={openEditFoodForm}
            onDelete={onDeleteFood}
            onRevertOverride={onRevertFoodOverride}
          />
        ))}
      </div>

      {!searchQuery.trim() && filteredFoods.length > displayedFoods.length && (
        <div className="text-center pt-1">
          <button
            type="button"
            id="load-more-foods-btn"
            onClick={() => setVisibleLimit((n) => n + 80)}
            className="rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2E2E36] px-5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors tabular-nums-fa"
          >
            نمایش غذاهای بیشتر ({formatFaNumber(filteredFoods.length - displayedFoods.length)} مورد
            باقی‌مانده)
          </button>
        </div>
      )}

      {filteredFoods.length === 0 && (
        <div className="card-surface rounded-2xl p-8 text-center space-y-3">
          <Utensils className="w-7 h-7 text-zinc-400 mx-auto" />
          <p className="text-sm font-medium text-zinc-300">غذایی با این فیلتر پیدا نشد</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {nutrientFilter !== 'none' && (
              <button
                type="button"
                onClick={() => selectNutrientFilter('none')}
                className="rounded-xl bg-[#1E1E22] border border-[#2E2E36] text-zinc-200 font-semibold text-xs px-3.5 py-2"
              >
                حذف فیلتر تغذیه‌ای
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setModalMode('single')
                setEditingRecipe(null)
                setFormState(createEmptyForm(searchQuery.trim()))
                setFormError(null)
                setFormOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 text-[#051B11] font-bold text-xs px-4 py-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن «{searchQuery.trim() || 'غذای جدید'}» به دستگاه من</span>
            </button>
            {searchQuery.trim() && (
              <a
                href={buildMissingFoodIssueUrl(searchQuery.trim())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#282830] border border-[#2E2E36] text-zinc-200 font-semibold text-xs px-3.5 py-2"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>درخواست افزودن به کاتالوگ همگانی</span>
              </a>
            )}
          </div>
        </div>
      )}

      {formOpen &&
        createPortal(
          <div
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label={
              modalMode === 'recipe'
                ? 'ساخت یا ویرایش دستور پخت ترکیبی'
                : formState.editingId
                  ? 'ویرایش غذا'
                  : 'افزودن غذای جدید'
            }
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          >
            <div
              ref={modalContainerRef}
              className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto bg-[#161618] border border-[#2C2C32] rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl animate-fade-up"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-zinc-100">
                  {modalMode === 'recipe'
                    ? editingRecipe
                      ? 'ویرایش دستور پخت ترکیبی'
                      : 'ساخت دستور پخت ترکیبی'
                    : formState.editingId
                      ? 'ویرایش اطلاعات غذا'
                      : 'افزودن غذای خانگی جدید'}
                </h3>
                <button
                  type="button"
                  onClick={closeForm}
                  aria-label="بستن پنجره"
                  className="w-8 h-8 rounded-lg bg-[#222228] hover:bg-[#2D2D35] text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!formState.editingId && !editingRecipe && (
                <div className="grid grid-cols-2 rounded-xl bg-[#0C0C0D] p-1 border border-[#26262A] mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('single')
                      setFormError(null)
                    }}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      modalMode === 'single'
                        ? 'bg-emerald-500 text-[#051B11] font-bold'
                        : 'text-zinc-400'
                    }`}
                  >
                    غذای تکی
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('recipe')
                      setFormError(null)
                    }}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      modalMode === 'recipe'
                        ? 'bg-emerald-500 text-[#051B11] font-bold'
                        : 'text-zinc-400'
                    }`}
                  >
                    دستور پخت ترکیبی
                  </button>
                </div>
              )}

              {modalMode === 'single' ? (
                <SingleFoodForm
                  formState={formState}
                  setFormState={setFormState}
                  formError={formError}
                  setFormError={setFormError}
                  onAddFood={onAddFood}
                  onUpdateFood={onUpdateFood}
                  onClose={closeForm}
                />
              ) : (
                <RecipeBuilderForm
                  key={editingRecipe?.id ?? 'new-recipe'}
                  foods={foods}
                  foodById={foodById}
                  editingRecipe={editingRecipe}
                  formError={formError}
                  setFormError={setFormError}
                  onAddFood={onAddFood}
                  onUpdateFood={onUpdateFood}
                  onClose={closeForm}
                />
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
