import { Camera, ChevronLeft, Plus } from "lucide-react";
import type { MealType } from "@nutivo/core";
import { faInt } from "@/shared/lib/format";
import { FoodIconTile } from "@/shared/ui/food-icon";
import type { LoggedItem } from "@/entities/day/sample";
import type { MealGroup } from "../model/day";

export const MEAL_LABEL: Record<MealType, string> = { breakfast: "صبحانه", lunch: "ناهار", snack: "میان‌وعده", dinner: "شام" };

interface Props {
  groups: MealGroup[];
  freshKeys: Set<string>;
  /** Items playing their exit animation before they disappear. */
  leavingKeys?: Set<string>;
  onAdd: (m: MealType) => void;
  /** Tap a food to edit or delete it. Omit for a read-only list. */
  onEdit?: (item: LoggedItem) => void;
  title?: string;
}

export function MealList({ groups, freshKeys, leavingKeys, onAdd, onEdit, title = "وعده‌های امروز" }: Props) {
  return (
    <section aria-labelledby="meals-title" className="grid gap-3">
      <h2 id="meals-title" className="text-xl font-semibold">{title}</h2>
      {groups.map((g) => (
        <article key={g.meal_type} className="rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-soft)]">
          <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
            <h3 className="text-base font-semibold">{MEAL_LABEL[g.meal_type]}</h3>
            {g.items.length > 0 ? (
              <span className="tabular text-sm text-ink-2">
                {g.hasEstimate && "≈ "}
                {faInt(g.macros.kcal)} کالری
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onAdd(g.meal_type)}
                className="flex items-center gap-1 rounded-[var(--radius-btn)] px-2 py-1 text-sm font-medium text-green-ink hover:bg-mint"
              >
                <Plus size={16} strokeWidth={2} aria-hidden />
                افزودن
              </button>
            )}
          </header>
          {g.items.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-ink-2">هنوز چیزی ثبت نشده.</p>
          ) : (
            <ul className="divide-y divide-line px-4 pb-1.5">
              {g.items.map((it) => (
                <li key={it.key} className={`overflow-hidden ${leavingKeys?.has(it.key) ? "animate-leave" : freshKeys.has(it.key) ? "animate-rise" : ""}`}>
                  <button
                    type="button"
                    disabled={!onEdit}
                    onClick={() => onEdit?.(it)}
                    aria-label={onEdit ? `ویرایش ${it.food.name_fa}` : undefined}
                    className="group -mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-[var(--radius-btn)] px-2 py-2.5 text-start transition-colors duration-150 enabled:hover:bg-track/60 enabled:active:bg-track"
                  >
                  <FoodIconTile food={it.food} size="sm" estimated={it.is_estimated} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[15px]">
                      {it.food.name_fa}
                      {it.from_photo && <Camera size={14} strokeWidth={2} className="shrink-0 text-ink-2" aria-label="از روی عکس" />}
                    </p>
                    <p className="tabular text-xs text-ink-2">
                      {faInt(it.qty)} {it.unit !== "گرم" && it.unit}
                      {it.unit !== "گرم" ? ` · ${it.is_estimated ? "≈ " : ""}${faInt(it.grams)} گرم` : " گرم"}
                    </p>
                  </div>
                  <div className="tabular shrink-0 text-left">
                    <p className="text-sm font-semibold">
                      {it.is_estimated && "≈ "}
                      {faInt(it.macros.kcal)}
                    </p>
                    <p className="text-[11px] text-ink-2">پ {faInt(it.macros.protein_g)}</p>
                  </div>
                  {onEdit && <ChevronLeft size={16} strokeWidth={1.75} className="-ms-1 shrink-0 text-ink-2/60 transition-transform duration-150 group-hover:-translate-x-0.5" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </section>
  );
}
