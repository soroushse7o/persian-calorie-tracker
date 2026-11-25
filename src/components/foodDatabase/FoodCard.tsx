import { BadgeCheck, Edit3, Flag, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { buildWrongFoodDataIssueUrl } from '../../config/feedback'
import type { FoodItem } from '../../types/nutrition'
import { calculateFoodMacros } from '../../utils/persianFoodParser'
import { formatFaNumber } from '../../utils/persianFormat'

interface FoodCardProps {
  food: FoodItem
  onQuickUse: (food: FoodItem) => void
  onEdit: (food: FoodItem) => void
  onDelete: (id: string) => void
  onRevertOverride?: (id: string) => void
}

export function FoodCard({
  food,
  onQuickUse,
  onEdit,
  onDelete,
  onRevertOverride,
}: FoodCardProps) {
  const defaultUnitObj = food.units.find((u) => u.name === food.defaultUnit) ?? food.units[0]
  const perDefault = calculateFoodMacros(food, 1, defaultUnitObj.grams)

  return (
    <div
      data-testid="food-db-card"
      className="card-surface rounded-2xl p-3.5 flex flex-col justify-between gap-2.5 hover:border-[#34343B] transition-colors"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-semibold text-zinc-100 truncate">{food.name}</h3>
            {food.isRecipe && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300">
                دستور پخت
              </span>
            )}
            {food.isCustom && !food.isRecipe && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300">
                شخصی
              </span>
            )}
            {food.isOverridden && (
              <span
                data-testid="food-overridden-badge"
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-300"
              >
                ویرایش‌شده
              </span>
            )}
            {food.verified ? (
              <span
                title={food.source ?? 'تطبیق‌شده با جدول مرجع (برآورد تقریبی)'}
                data-testid="food-verified-badge"
                className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300"
              >
                <BadgeCheck className="w-3 h-3" />
                <span>منبع مرجع (تقریبی)</span>
              </span>
            ) : (
              !food.isCustom && (
                <span
                  title={food.source ?? 'برآورد تقریبی خانگی'}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#1E1E22] text-zinc-400"
                >
                  برآورد تقریبی
                </span>
              )
            )}
          </div>

          <p className="text-[11px] text-zinc-400 mt-1 tabular-nums-fa">
            هر ۱ {defaultUnitObj.name} (
            {formatFaNumber(defaultUnitObj.grams, defaultUnitObj.grams < 10 ? 1 : 0)} گرم):{' '}
            <span className="text-emerald-400 font-bold">
              ~{formatFaNumber(perDefault.kcal)} کالری
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onQuickUse(food)}
            title={`ثبت سریع ${food.name}`}
            aria-label={`ثبت سریع ${food.name}`}
            className="w-8 h-8 rounded-lg bg-emerald-500/12 hover:bg-emerald-500/25 text-emerald-400 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(food)}
            aria-label={`ویرایش ${food.name}`}
            className="w-8 h-8 rounded-lg bg-[#1E1E22] hover:bg-[#292930] text-zinc-300 flex items-center justify-center transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          {food.isOverridden && onRevertOverride && (
            <button
              type="button"
              onClick={() => onRevertOverride(food.id)}
              title="بازگردانی این غذا به مقدار پیش‌فرض کاتالوگ"
              aria-label={`بازنشانی ویرایش ${food.name}`}
              className="w-8 h-8 rounded-lg bg-[#1E1E22] hover:bg-amber-500/15 text-amber-300 flex items-center justify-center transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {food.isCustom ? (
            <button
              type="button"
              onClick={() => onDelete(food.id)}
              aria-label={`حذف ${food.name}`}
              className="w-8 h-8 rounded-lg bg-[#1E1E22] hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <a
              href={buildWrongFoodDataIssueUrl(food)}
              target="_blank"
              rel="noopener noreferrer"
              title={`گزارش خطا در کالری یا واحد «${food.name}»`}
              aria-label={`گزارش خطای اطلاعات ${food.name}`}
              className="w-8 h-8 rounded-lg bg-[#1E1E22] hover:bg-[#292930] text-zinc-400 hover:text-amber-300 flex items-center justify-center transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#222227] text-[11px] tabular-nums-fa">
        <div className="flex items-center gap-2.5 text-zinc-400">
          <span>۱۰۰ گرم:</span>
          <span className="text-zinc-200 font-medium">~{formatFaNumber(food.per100g.kcal)} ک</span>
          <span className="text-sky-400/90">پ {formatFaNumber(food.per100g.protein, 1)}</span>
          <span className="text-amber-400/90">ک {formatFaNumber(food.per100g.carbs, 1)}</span>
          <span className="text-rose-400/90">چ {formatFaNumber(food.per100g.fat, 1)}</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {food.units
            .filter((u) => u.name !== 'گرم')
            .slice(0, 3)
            .map((u) => (
              <span
                key={u.name}
                className="px-1.5 py-0.5 rounded-md bg-[#1E1E22] text-zinc-300 text-[10px]"
              >
                {u.name}
              </span>
            ))}
        </div>
      </div>

      {food.source && (
        <p className="text-[10px] text-zinc-500 truncate" title={food.source}>
          منبع: {food.source}
        </p>
      )}
    </div>
  )
}
