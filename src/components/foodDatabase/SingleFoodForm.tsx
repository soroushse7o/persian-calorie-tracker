import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { resolveFoodMicronutrients } from '../../data/foods/micronutrientRegistry'
import {
  FOOD_CATEGORY_LABELS,
  type FoodCategory,
  type FoodItem,
  type FoodUnit,
  type MicronutrientValues,
} from '../../types/nutrition'
import { toAsciiDigits } from '../../utils/persianFormat'
import {
  CATEGORY_ORDER,
  parsePositiveNum,
  type FoodFormState,
  type UnitDraft,
} from './foodFormHelpers'

interface SingleFoodFormProps {
  formState: FoodFormState
  setFormState: React.Dispatch<React.SetStateAction<FoodFormState>>
  formError: string | null
  setFormError: (err: string | null) => void
  onAddFood: (food: Omit<FoodItem, 'id'>) => void
  onUpdateFood: (food: FoodItem) => void
  onClose: () => void
}

export function SingleFoodForm({
  formState,
  setFormState,
  formError,
  setFormError,
  onAddFood,
  onUpdateFood,
  onClose,
}: SingleFoodFormProps) {
  const [showMicroFields, setShowMicroFields] = useState(false)
  const activeDefaultUnitLabel =
    formState.units[formState.defaultUnitIndex]?.name.trim() || 'واحد پیش‌فرض'

  const handleUnitChange = (index: number, field: keyof UnitDraft, value: string) => {
    setFormState((prev) => ({
      ...prev,
      units: prev.units.map((u, i) => (i === index ? { ...u, [field]: value } : u)),
    }))
  }

  const handleAddUnitRow = () => {
    setFormState((prev) => ({
      ...prev,
      units: [...prev.units, { name: '', grams: '100' }],
    }))
  }

  const handleRemoveUnitRow = (index: number) => {
    setFormState((prev) => {
      if (prev.units.length <= 1) return prev
      const nextUnits = prev.units.filter((_, i) => i !== index)
      const nextDefault = Math.min(prev.defaultUnitIndex, nextUnits.length - 1)
      return {
        ...prev,
        units: nextUnits,
        defaultUnitIndex: nextDefault,
      }
    })
  }

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = formState.name.trim()
    if (!cleanName) {
      setFormError('لطفاً نام غذا را وارد کنید.')
      return
    }

    const parsedUnits: FoodUnit[] = formState.units
      .map((u) => ({
        name: u.name.trim(),
        grams: parsePositiveNum(u.grams, 0),
      }))
      .filter((u) => u.name.length > 0 && u.grams > 0)

    if (parsedUnits.length === 0) {
      setFormError('حداقل یک واحد خانگی با وزن معتبر (بر حسب گرم) وارد کنید.')
      return
    }

    const defaultUnitObj =
      parsedUnits[Math.min(formState.defaultUnitIndex, parsedUnits.length - 1)] ?? parsedUnits[0]

    const rawKcal = parsePositiveNum(formState.kcal, -1)
    if (rawKcal <= 0) {
      setFormError('لطفاً مقدار کالری معتبر (بزرگ‌تر از صفر) وارد کنید.')
      return
    }

    const rawProtein = parsePositiveNum(formState.protein, 0)
    const rawCarbs = parsePositiveNum(formState.carbs, 0)
    const rawFat = parsePositiveNum(formState.fat, 0)
    const rawFiber = parsePositiveNum(formState.fiber, 0)

    const factor = formState.inputMode === 'perUnit' ? 100 / defaultUnitObj.grams : 1
    const baseKcal100 = Math.round(rawKcal * factor * 10) / 10
    const baseProt100 = Math.round(rawProtein * factor * 10) / 10
    const baseCarbs100 = Math.round(rawCarbs * factor * 10) / 10
    const baseFat100 = Math.round(rawFat * factor * 10) / 10

    const fallbackMicro = resolveFoodMicronutrients(
      formState.editingId ?? 'custom',
      cleanName,
      formState.category,
      [baseKcal100, baseProt100, baseCarbs100, baseFat100],
    )

    const micronutrients: MicronutrientValues = {
      ...fallbackMicro,
      ...(formState.ironMg.trim()
        ? { ironMg: Math.round(parsePositiveNum(formState.ironMg, 0) * factor * 10) / 10 }
        : {}),
      ...(formState.calciumMg.trim()
        ? { calciumMg: Math.round(parsePositiveNum(formState.calciumMg, 0) * factor) }
        : {}),
      ...(formState.sodiumMg.trim()
        ? { sodiumMg: Math.round(parsePositiveNum(formState.sodiumMg, 0) * factor) }
        : {}),
      ...(formState.potassiumMg.trim()
        ? { potassiumMg: Math.round(parsePositiveNum(formState.potassiumMg, 0) * factor) }
        : {}),
      ...(formState.vitaminCMg.trim()
        ? { vitaminCMg: Math.round(parsePositiveNum(formState.vitaminCMg, 0) * factor) }
        : {}),
      ...(formState.vitaminDMcg.trim()
        ? { vitaminDMcg: Math.round(parsePositiveNum(formState.vitaminDMcg, 0) * factor * 10) / 10 }
        : {}),
    }

    const per100g = {
      kcal: baseKcal100,
      protein: baseProt100,
      carbs: baseCarbs100,
      fat: baseFat100,
      fiber: Math.round(rawFiber * factor * 10) / 10,
      micronutrients,
    }

    const aliases = formState.aliasesText
      .split(/[،,]/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0 && a !== cleanName)

    const cleanBarcode = toAsciiDigits(formState.barcode).replace(/\D/g, '')

    const payload: Omit<FoodItem, 'id'> = {
      name: cleanName,
      aliases,
      category: formState.category,
      per100g,
      defaultUnit: defaultUnitObj.name,
      units: [...parsedUnits, { name: 'گرم', grams: 1 }],
      ...(cleanBarcode.length >= 8 ? { barcode: cleanBarcode } : {}),
      isCustom: formState.isCustom,
    }

    if (formState.editingId) {
      onUpdateFood({ ...payload, id: formState.editingId })
    } else {
      onAddFood(payload)
    }

    onClose()
  }

  return (
    <form onSubmit={handleSubmitForm} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="food-name-input" className="block text-xs text-zinc-300 mb-1.5">
            نام غذا *
          </label>
          <input
            id="food-name-input"
            type="text"
            required
            value={formState.name}
            onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
            placeholder="مثلاً: سوپ جو خانگی"
            className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2.5 text-sm text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="food-category-select" className="block text-xs text-zinc-300 mb-1.5">
            دسته‌بندی
          </label>
          <select
            id="food-category-select"
            value={formState.category}
            onChange={(e) =>
              setFormState((p) => ({ ...p, category: e.target.value as FoodCategory }))
            }
            className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2.5 text-sm text-zinc-100"
          >
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {FOOD_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="food-aliases-input" className="block text-xs text-zinc-300 mb-1.5">
            نام‌های جایگزین (با ویرگول)
          </label>
          <input
            id="food-aliases-input"
            type="text"
            value={formState.aliasesText}
            onChange={(e) => setFormState((p) => ({ ...p, aliasesText: e.target.value }))}
            placeholder="مثلاً: سوپ جو، سوپ سفید"
            className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label htmlFor="food-barcode-input" className="block text-xs text-zinc-300 mb-1.5">
            بارکد محصول (اختیاری — ۶۲۶...)
          </label>
          <input
            id="food-barcode-input"
            type="text"
            inputMode="numeric"
            value={formState.barcode}
            onChange={(e) => setFormState((p) => ({ ...p, barcode: e.target.value }))}
            placeholder="626..."
            className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-sm text-zinc-100 tabular-nums-fa"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-300">
            واحدهای خانگی و وزن هر واحد (گرم)
          </span>
          <button
            type="button"
            onClick={handleAddUnitRow}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>واحد جدید</span>
          </button>
        </div>

        <div className="space-y-2">
          {formState.units.map((u, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name="defaultUnit"
                checked={formState.defaultUnitIndex === idx}
                onChange={() => setFormState((p) => ({ ...p, defaultUnitIndex: idx }))}
                title="واحد پیش‌فرض"
                aria-label={`انتخاب واحد پیش‌فرض ردیف ${idx + 1}`}
                className="accent-emerald-500 shrink-0"
              />
              <input
                type="text"
                id={idx === 0 ? 'food-unit-name-0' : undefined}
                value={u.name}
                onChange={(e) => handleUnitChange(idx, 'name', e.target.value)}
                placeholder="مثلاً: ملاقه، کفگیر، پیمانه"
                className="flex-1 min-w-0 rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-xs sm:text-sm text-zinc-100"
              />
              <input
                type="text"
                inputMode="decimal"
                id={idx === 0 ? 'food-unit-grams-0' : undefined}
                value={u.grams}
                onChange={(e) => handleUnitChange(idx, 'grams', e.target.value)}
                placeholder="گرم"
                className="w-24 rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-xs sm:text-sm text-zinc-100 tabular-nums-fa"
              />
              {formState.units.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveUnitRow(idx)}
                  aria-label="حذف واحد"
                  className="w-8 h-8 rounded-lg hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400 flex items-center justify-center shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-300">ارزش غذایی (برآورد تقریبی)</span>
          <div className="inline-flex rounded-xl bg-[#0C0C0D] p-0.5 border border-[#26262A]">
            <button
              type="button"
              onClick={() => setFormState((p) => ({ ...p, inputMode: 'perUnit' }))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                formState.inputMode === 'perUnit'
                  ? 'bg-emerald-500 text-[#051B11] font-semibold'
                  : 'text-zinc-400'
              }`}
            >
              در هر ۱ {activeDefaultUnitLabel}
            </button>
            <button
              type="button"
              onClick={() => setFormState((p) => ({ ...p, inputMode: 'per100g' }))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                formState.inputMode === 'per100g'
                  ? 'bg-emerald-500 text-[#051B11] font-semibold'
                  : 'text-zinc-400'
              }`}
            >
              در هر ۱۰۰ گرم
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div>
            <label htmlFor="food-kcal-input" className="block text-[11px] text-emerald-400 mb-1">
              کالری *
            </label>
            <input
              id="food-kcal-input"
              type="text"
              inputMode="decimal"
              required
              value={formState.kcal}
              onChange={(e) => setFormState((p) => ({ ...p, kcal: e.target.value }))}
              placeholder="۱۸۰"
              className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-2.5 py-2 text-sm text-zinc-100 tabular-nums-fa"
            />
          </div>
          <div>
            <label htmlFor="food-protein-input" className="block text-[11px] text-sky-400 mb-1">
              پروتئین (گ)
            </label>
            <input
              id="food-protein-input"
              type="text"
              inputMode="decimal"
              value={formState.protein}
              onChange={(e) => setFormState((p) => ({ ...p, protein: e.target.value }))}
              placeholder="۸"
              className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-sky-400/70 focus:outline-none px-2.5 py-2 text-sm text-zinc-100 tabular-nums-fa"
            />
          </div>
          <div>
            <label htmlFor="food-carbs-input" className="block text-[11px] text-amber-400 mb-1">
              کربوهیدرات (گ)
            </label>
            <input
              id="food-carbs-input"
              type="text"
              inputMode="decimal"
              value={formState.carbs}
              onChange={(e) => setFormState((p) => ({ ...p, carbs: e.target.value }))}
              placeholder="۲۰"
              className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-amber-400/70 focus:outline-none px-2.5 py-2 text-sm text-zinc-100 tabular-nums-fa"
            />
          </div>
          <div>
            <label htmlFor="food-fat-input" className="block text-[11px] text-rose-400 mb-1">
              چربی (گ)
            </label>
            <input
              id="food-fat-input"
              type="text"
              inputMode="decimal"
              value={formState.fat}
              onChange={(e) => setFormState((p) => ({ ...p, fat: e.target.value }))}
              placeholder="۵"
              className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-rose-400/70 focus:outline-none px-2.5 py-2 text-sm text-zinc-100 tabular-nums-fa"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="food-fiber-input" className="block text-[11px] text-lime-400 mb-1">
              فیبر (گ)
            </label>
            <input
              id="food-fiber-input"
              type="text"
              inputMode="decimal"
              value={formState.fiber}
              onChange={(e) => setFormState((p) => ({ ...p, fiber: e.target.value }))}
              placeholder="۲"
              className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-lime-400/70 focus:outline-none px-2.5 py-2 text-sm text-zinc-100 tabular-nums-fa"
            />
          </div>
        </div>

        {/* Collapsible Micronutrient Inputs */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowMicroFields((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-emerald-300 transition-colors"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showMicroFields ? 'rotate-180' : ''}`}
            />
            <span>ریزمغزی‌های اختیاری از روی جدول بسته (آهن، کلسیم، سدیم، ویتامین‌ها)</span>
          </button>

          {showMicroFields && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl bg-[#0C0C0D]/60 border border-[#24242C] p-3">
              <div>
                <label htmlFor="food-iron-input" className="block text-[11px] text-zinc-300 mb-1">
                  آهن (mg)
                </label>
                <input
                  id="food-iron-input"
                  type="text"
                  inputMode="decimal"
                  value={formState.ironMg}
                  onChange={(e) => setFormState((p) => ({ ...p, ironMg: e.target.value }))}
                  placeholder="خودکار"
                  className="w-full rounded-lg bg-[#141418] border border-[#2C2C33] px-2.5 py-1.5 text-xs text-zinc-100 tabular-nums-fa"
                />
              </div>
              <div>
                <label htmlFor="food-calcium-input" className="block text-[11px] text-zinc-300 mb-1">
                  کلسیم (mg)
                </label>
                <input
                  id="food-calcium-input"
                  type="text"
                  inputMode="decimal"
                  value={formState.calciumMg}
                  onChange={(e) => setFormState((p) => ({ ...p, calciumMg: e.target.value }))}
                  placeholder="خودکار"
                  className="w-full rounded-lg bg-[#141418] border border-[#2C2C33] px-2.5 py-1.5 text-xs text-zinc-100 tabular-nums-fa"
                />
              </div>
              <div>
                <label htmlFor="food-sodium-input" className="block text-[11px] text-zinc-300 mb-1">
                  سدیم (mg)
                </label>
                <input
                  id="food-sodium-input"
                  type="text"
                  inputMode="decimal"
                  value={formState.sodiumMg}
                  onChange={(e) => setFormState((p) => ({ ...p, sodiumMg: e.target.value }))}
                  placeholder="خودکار"
                  className="w-full rounded-lg bg-[#141418] border border-[#2C2C33] px-2.5 py-1.5 text-xs text-zinc-100 tabular-nums-fa"
                />
              </div>
              <div>
                <label htmlFor="food-potassium-input" className="block text-[11px] text-zinc-300 mb-1">
                  پتاسیم (mg)
                </label>
                <input
                  id="food-potassium-input"
                  type="text"
                  inputMode="decimal"
                  value={formState.potassiumMg}
                  onChange={(e) => setFormState((p) => ({ ...p, potassiumMg: e.target.value }))}
                  placeholder="خودکار"
                  className="w-full rounded-lg bg-[#141418] border border-[#2C2C33] px-2.5 py-1.5 text-xs text-zinc-100 tabular-nums-fa"
                />
              </div>
              <div>
                <label htmlFor="food-vitc-input" className="block text-[11px] text-zinc-300 mb-1">
                  ویتامین C (mg)
                </label>
                <input
                  id="food-vitc-input"
                  type="text"
                  inputMode="decimal"
                  value={formState.vitaminCMg}
                  onChange={(e) => setFormState((p) => ({ ...p, vitaminCMg: e.target.value }))}
                  placeholder="خودکار"
                  className="w-full rounded-lg bg-[#141418] border border-[#2C2C33] px-2.5 py-1.5 text-xs text-zinc-100 tabular-nums-fa"
                />
              </div>
              <div>
                <label htmlFor="food-vitd-input" className="block text-[11px] text-zinc-300 mb-1">
                  ویتامین D (mcg)
                </label>
                <input
                  id="food-vitd-input"
                  type="text"
                  inputMode="decimal"
                  value={formState.vitaminDMcg}
                  onChange={(e) => setFormState((p) => ({ ...p, vitaminDMcg: e.target.value }))}
                  placeholder="خودکار"
                  className="w-full rounded-lg bg-[#141418] border border-[#2C2C33] px-2.5 py-1.5 text-xs text-zinc-100 tabular-nums-fa"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {formError && (
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
          {formError}
        </p>
      )}

      <div className="flex items-center gap-2.5 pt-2">
        <button
          type="submit"
          id="save-food-submit-btn"
          className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-sm py-2.5 transition-colors"
        >
          {formState.editingId ? 'ذخیره تغییرات (شخصی روی دستگاه)' : 'ذخیره در بانک غذا'}
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
