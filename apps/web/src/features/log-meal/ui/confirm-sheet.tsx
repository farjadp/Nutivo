"use client";
import type { MealType } from "@nutivo/core";
import { Camera, CircleHelp, Minus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toLatinDigits, toPersianDigits } from "@nutivo/core";
import { faInt } from "@/shared/lib/format";
import { FoodIconTile } from "@/shared/ui/food-icon";
import { nutiSay } from "@/features/mascot/model/lines";
import { Nuti } from "@/features/mascot/ui/nuti";
import type { Draft, DraftItem } from "../model/draft";
import { draftTotals, itemMacros, regram, unitOptions } from "../model/recalc";

const MEALS: { v: MealType; l: string }[] = [
  { v: "breakfast", l: "صبحانه" },
  { v: "lunch", l: "ناهار" },
  { v: "snack", l: "میان‌وعده" },
  { v: "dinner", l: "شام" },
];

interface Props {
  draft: Draft;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (meal_type: MealType, items: DraftItem[]) => void;
  nuti?: boolean;
}

export function ConfirmSheet({ draft, saving, error, onCancel, onConfirm, nuti = false }: Props) {
  const [meal, setMeal] = useState<MealType>(draft.meal_type);
  const [items, setItems] = useState<DraftItem[]>(draft.items);
  const [focusKey, setFocusKey] = useState<string | null>(draft.items.find((i) => i.question)?.key ?? null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const totals = useMemo(() => draftTotals(items, draft.foods), [items, draft.foods]);
  const ready = items.length > 0 && items.every((i) => i.food_id && i.grams && i.grams > 0);
  const anyEstimated = items.some((i) => i.is_estimated);

  function update(key: string, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== key) return it;
        const next = { ...it, ...patch };
        if ("grams" in patch && !("qty" in patch) && !("unit" in patch) && !("food_id" in patch)) return { ...next, question: undefined };
        const food = next.food_id ? draft.foods[next.food_id] : undefined;
        const g = regram(next, food, next.food_id ? draft.units[next.food_id] ?? [] : []);
        return { ...next, ...g, question: g.grams ? undefined : next.question };
      }),
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" role="presentation">
      <button type="button" aria-label="بستن" onClick={onCancel} className="absolute inset-0 animate-[fade_200ms_ease-out_both] bg-ink/35" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="animate-sheet relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[24px] bg-ground pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_rgb(16_24_40/0.12)] outline-none"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" aria-hidden />
        <header className="flex items-center justify-between gap-3 px-4 pt-3">
          <h2 id="confirm-title" className="text-xl font-semibold">تأیید وعده</h2>
          <button type="button" onClick={onCancel} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-track" aria-label="انصراف">
            <X size={20} strokeWidth={2} />
          </button>
        </header>

        <div className="flex gap-2 overflow-x-auto px-4 pt-3" role="radiogroup" aria-label="وعده">
          {MEALS.map((m) => (
            <button
              key={m.v}
              type="button"
              role="radio"
              aria-checked={meal === m.v}
              onClick={() => setMeal(m.v)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors duration-150 ${meal === m.v ? "border-green bg-mint font-semibold text-green-ink" : "border-line bg-surface text-ink"}`}
            >
              {m.l}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 overflow-y-auto px-4 pb-4">
          {draft.photo_preview_url && (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
            <img src={draft.photo_preview_url} alt="عکس وعده" className="aspect-[4/3] w-full rounded-[var(--radius-card)] object-cover" />
          )}
          {draft.raw_input && !draft.photo_preview_url && (
            <p className="rounded-[var(--radius-btn)] bg-track px-3 py-2 text-sm text-ink-2">«{draft.raw_input}»</p>
          )}

          {nuti && items.some((i) => i.question) && (
            <div className="flex items-center gap-2 rounded-[var(--radius-btn)] bg-purple-tint px-2 py-1.5 text-[13px] font-medium text-purple-ink">
              <Nuti mood="think" size={36} label="" />
              {nutiSay("question").text}
            </div>
          )}
          <ul className="grid gap-2">
            {items.map((it) => {
              const food = it.food_id ? draft.foods[it.food_id] : undefined;
              const units = it.food_id ? draft.units[it.food_id] ?? [] : [];
              const mac = itemMacros(it, draft.foods);
              const active = focusKey === it.key;
              return (
                <li
                  key={it.key}
                  onFocusCapture={() => setFocusKey(it.key)}
                  className={`rounded-[var(--radius-card)] border bg-surface p-3 transition-opacity duration-200 ${it.question ? "border-fat" : "border-line"} ${focusKey && !active ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <FoodIconTile food={food ?? { name_fa: it.name_raw }} size="md" estimated={it.is_estimated} />
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`food-${it.key}`} className="sr-only">غذا</label>
                      <select
                        id={`food-${it.key}`}
                        value={it.food_id ?? ""}
                        onChange={(e) => update(it.key, { food_id: e.target.value || null })}
                        className="w-full truncate bg-transparent text-[15px] font-semibold outline-none"
                      >
                        {!it.food_id && <option value="">انتخاب غذا برای «{it.name_raw}»</option>}
                        {it.candidate_ids.map((id) => (
                          <option key={id} value={id}>{draft.foods[id]?.name_fa ?? id}</option>
                        ))}
                      </select>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-2">
                        {it.from_photo && <Camera size={12} strokeWidth={2} aria-label="از روی عکس" />}
                        «{it.name_raw}»
                        {food && food.confidence !== "high" && <span> · داده {food.confidence === "low" ? "کم‌اطمینان" : "تقریبی"}</span>}
                        {food?.source === "figfit" && (
                          <a href="https://figfit.ir" target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2" title="FigFit food database, CC BY-NC-SA 4.0">
                            · منبع: FigFit
                          </a>
                        )}
                      </p>
                    </div>
                    <button type="button" onClick={() => setItems((p) => p.filter((x) => x.key !== it.key))} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-track hover:text-error" aria-label={`حذف ${it.name_raw}`}>
                      <Trash2 size={16} strokeWidth={1.75} />
                    </button>
                  </div>

                  {it.question && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-[var(--radius-btn)] bg-[color-mix(in_srgb,var(--fat)_12%,transparent)] px-2.5 py-2 text-[13px] leading-6">
                      <CircleHelp size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-fat-ink" aria-hidden />
                      {it.question}
                    </p>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-[var(--radius-btn)] border border-line">
                      <button type="button" onClick={() => update(it.key, { qty: Math.max(0, +(it.qty - (it.qty > 1 ? 1 : 0.5)).toFixed(2)) })} className="grid size-9 place-items-center text-ink-2" aria-label="کم کن">
                        <Minus size={16} strokeWidth={2} />
                      </button>
                      <label htmlFor={`qty-${it.key}`} className="sr-only">مقدار</label>
                      <input
                        id={`qty-${it.key}`}
                        inputMode="decimal"
                        value={toPersianDigits(it.qty)}
                        onChange={(e) => {
                          const n = Number(toLatinDigits(e.target.value).replace("٫", "."));
                          if (Number.isFinite(n)) update(it.key, { qty: n });
                        }}
                        className="tabular w-12 bg-transparent text-center text-[15px] outline-none"
                      />
                      <button type="button" onClick={() => update(it.key, { qty: +(it.qty + (it.qty >= 1 ? 1 : 0.5)).toFixed(2) })} className="grid size-9 place-items-center text-ink-2" aria-label="زیاد کن">
                        <Plus size={16} strokeWidth={2} />
                      </button>
                    </div>
                    <label htmlFor={`unit-${it.key}`} className="sr-only">واحد</label>
                    <select
                      id={`unit-${it.key}`}
                      value={it.unit}
                      onChange={(e) => update(it.key, { unit: e.target.value })}
                      className="h-9 rounded-[var(--radius-btn)] border border-line bg-surface px-2 text-sm"
                    >
                      {unitOptions(food, units, it.unit).map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>

                    {it.grams == null && food ? (
                      <div className="flex items-center gap-1">
                        <label htmlFor={`g-${it.key}`} className="text-xs text-ink-2">وزن:</label>
                        <input
                          id={`g-${it.key}`}
                          inputMode="numeric"
                          placeholder="گرم"
                          onChange={(e) => {
                            const n = Number(toLatinDigits(e.target.value));
                            if (n > 0) update(it.key, { grams: n });
                          }}
                          className="tabular h-9 w-20 rounded-[var(--radius-btn)] border border-fat bg-surface px-2 text-sm"
                        />
                      </div>
                    ) : (
                      it.grams != null && (
                        <span className="tabular text-xs text-ink-2">
                          {it.is_estimated ? "≈ " : ""}
                          {faInt(it.grams)} گرم
                        </span>
                      )
                    )}

                    <span className="tabular ms-auto text-sm font-semibold">
                      {it.grams != null && food ? `${it.is_estimated ? "≈ " : ""}${faInt(mac.kcal)} کالری` : "—"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {items.length === 0 && <p className="text-center text-sm text-ink-2">همه آیتم‌ها حذف شد.</p>}
        </div>

        <footer className="grid gap-2 border-t border-line bg-surface px-4 pt-3 pb-3">
          <dl className="tabular grid grid-cols-4 gap-1 text-center text-xs">
            <div><dt className="text-ink-2">کالری</dt><dd className="text-base font-bold">{anyEstimated && "≈"}{faInt(totals.kcal)}</dd></div>
            <div><dt className="text-ink-2">پروتئین</dt><dd className="text-base font-bold text-purple-ink">{faInt(totals.protein_g)}</dd></div>
            <div><dt className="text-ink-2">کربو</dt><dd className="text-base font-bold text-carbs">{faInt(totals.carbs_g)}</dd></div>
            <div><dt className="text-ink-2">چربی</dt><dd className="text-base font-bold text-fat-ink">{faInt(totals.fat_g)}</dd></div>
          </dl>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <button
            type="button"
            disabled={!ready || saving}
            onClick={() => onConfirm(meal, items)}
            className="h-12 rounded-[var(--radius-btn)] bg-green-ink text-[15px] font-semibold text-surface transition-opacity duration-150 disabled:opacity-45"
          >
            {saving ? "در حال ثبت…" : ready ? `ثبت ${MEALS.find((m) => m.v === meal)?.l}` : "اول مقدار همه آیتم‌ها را کامل کن"}
          </button>
        </footer>
      </div>
    </div>
  );
}
