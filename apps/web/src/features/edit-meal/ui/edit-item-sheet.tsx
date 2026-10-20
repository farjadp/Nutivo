"use client";
import { macrosForGrams, toLatinDigits, toPersianDigits, type Food, type PortionUnit } from "@nutivo/core";
import { Camera, Minus, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LoggedItem } from "@/entities/day/sample";
import { regram, unitOptions } from "@/features/log-meal/model/recalc";
import { faInt } from "@/shared/lib/format";
import { FoodIconTile } from "@/shared/ui/food-icon";
import { foodUnitsAction, searchFoodsAction } from "../api/actions";

export interface ItemEdit {
  food: Food;
  qty: number;
  unit: string;
  grams: number;
  is_estimated: boolean;
}

interface Props {
  item: LoggedItem;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (edit: ItemEdit) => void;
  onDelete: () => void;
}

/** Edit one saved food: swap the food, change amount, unit or grams. Numbers come from the food row, recomputed live. */
export function EditItemSheet({ item, saving, error, onClose, onSave, onDelete }: Props) {
  const [food, setFood] = useState<Food>(item.food);
  const [qty, setQty] = useState(item.qty);
  const [unit, setUnit] = useState(item.unit);
  const [grams, setGrams] = useState<number | null>(item.grams);
  const [est, setEst] = useState(item.is_estimated);
  const [units, setUnits] = useState<Record<string, PortionUnit[]>>({});
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Units for the current food (once per food).
  useEffect(() => {
    if (units[food.id]) return;
    let live = true;
    foodUnitsAction(food.id)
      .then((u) => live && setUnits((prev) => ({ ...prev, [food.id]: u })))
      .catch(() => live && setUnits((prev) => ({ ...prev, [food.id]: [] })));
    return () => {
      live = false;
    };
  }, [food.id, units]);

  // Debounced search.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    let live = true;
    setSearching(true);
    const t = window.setTimeout(() => {
      searchFoodsAction(term)
        .then((r) => {
          if (!live) return;
          setHits(r.foods.filter((f) => f.id !== food.id).slice(0, 6));
          setUnits((prev) => ({ ...r.units, ...prev }));
        })
        .catch(() => live && setHits([]))
        .finally(() => live && setSearching(false));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [q, food.id]);

  const foodUnits = units[food.id] ?? [];

  function recompute(next: { food?: Food; qty?: number; unit?: string }) {
    const f = next.food ?? food;
    const draftLike = { key: item.key, name_raw: item.name_raw, qty: next.qty ?? qty, unit: next.unit ?? unit, confidence: item.confidence, from_photo: item.from_photo, food_id: f.id, candidate_ids: [], grams, is_estimated: est };
    const g = regram(draftLike, f, units[f.id] ?? []);
    setGrams(g.grams);
    setEst(g.is_estimated);
  }

  function pickFood(f: Food) {
    setFood(f);
    setQ("");
    setHits([]);
    // Keep the unit only if the new food knows it; otherwise fall back to grams with the same weight.
    const known = unit === "گرم" || (units[f.id] ?? []).some((u) => u.unit_fa === unit);
    if (known) recompute({ food: f });
    else {
      setUnit("گرم");
      setQty(grams ?? 100);
      setGrams(grams ?? 100);
    }
  }

  const mac = useMemo(() => (grams ? macrosForGrams(food, grams) : null), [food, grams]);
  const changed = food.id !== item.food.id || qty !== item.qty || unit !== item.unit || grams !== item.grams;
  const ready = grams != null && grams > 0 && qty > 0;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" role="presentation">
      <button type="button" aria-label="بستن" onClick={onClose} className="absolute inset-0 animate-[fade_200ms_ease-out_both] bg-ink/35" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-title"
        className="animate-sheet relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[24px] bg-ground pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_rgb(16_24_40/0.12)] outline-none"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" aria-hidden />
        <header className="flex items-center justify-between gap-3 px-4 pt-3">
          <h2 id="edit-title" className="text-xl font-semibold">ویرایش</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-track" aria-label="بستن">
            <X size={20} strokeWidth={2} />
          </button>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 overflow-y-auto px-4 pt-3 pb-4">
          <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3">
            <FoodIconTile key={food.id} food={food} size="lg" estimated={est} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-semibold">{food.name_fa}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-2">
                {item.from_photo && <Camera size={12} strokeWidth={2} aria-label="از روی عکس" />}
                «{item.name_raw}»
                {food.confidence !== "high" && <span> · داده {food.confidence === "low" ? "کم‌اطمینان" : "تقریبی"}</span>}
                {food.source === "figfit" && (
                  <a href="https://figfit.ir" target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2" title="FigFit food database, CC BY-NC-SA 4.0">
                    · منبع: FigFit
                  </a>
                )}
              </p>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
            <label htmlFor="edit-search" className="text-sm font-medium">غذای دیگری بود؟</label>
            <div className="flex h-11 items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface px-3 focus-within:border-green">
              <Search size={18} strokeWidth={1.75} className="shrink-0 text-ink-2" aria-hidden />
              <input
                id="edit-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="مثلاً قورمه‌سبزی"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
              />
              {searching && <span className="text-xs text-ink-2">…</span>}
            </div>
            {hits.length > 0 && (
              <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1" aria-label="نتیجه‌ها">
                {hits.map((f) => (
                  <li key={f.id} className="min-w-0">
                    <button type="button" onClick={() => pickFood(f)} className="animate-rise flex w-full items-center gap-3 rounded-[var(--radius-btn)] px-2 py-1.5 text-start hover:bg-mint">
                      <FoodIconTile food={f} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[15px]">{f.name_fa}</span>
                      <span className="tabular shrink-0 text-xs text-ink-2">{faInt(f.per100g.kcal)} در ۱۰۰ گرم</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {q.trim().length >= 2 && !searching && hits.length === 0 && <p className="text-xs text-ink-2">چیزی پیدا نشد.</p>}
          </div>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
            <span className="text-sm font-medium">مقدار</span>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-[var(--radius-btn)] border border-line bg-surface">
                <button type="button" onClick={() => { const n = unit === "گرم" ? Math.max(10, qty - 10) : Math.max(0.5, +(qty - (qty > 1 ? 1 : 0.5)).toFixed(2)); setQty(n); recompute({ qty: n }); }} className="grid size-11 place-items-center text-ink-2" aria-label="کم کن">
                  <Minus size={18} strokeWidth={2} />
                </button>
                <label htmlFor="edit-qty" className="sr-only">مقدار</label>
                <input
                  id="edit-qty"
                  inputMode="decimal"
                  value={toPersianDigits(qty)}
                  onChange={(e) => {
                    const n = Number(toLatinDigits(e.target.value).replace("٫", "."));
                    if (Number.isFinite(n)) { setQty(n); recompute({ qty: n }); }
                  }}
                  className="tabular w-14 bg-transparent text-center text-[17px] font-semibold outline-none"
                />
                <button type="button" onClick={() => { const n = unit === "گرم" ? qty + 10 : +(qty + (qty >= 1 ? 1 : 0.5)).toFixed(2); setQty(n); recompute({ qty: n }); }} className="grid size-11 place-items-center text-ink-2" aria-label="زیاد کن">
                  <Plus size={18} strokeWidth={2} />
                </button>
              </div>
              <label htmlFor="edit-unit" className="sr-only">واحد</label>
              <select
                id="edit-unit"
                value={unit}
                onChange={(e) => { setUnit(e.target.value); recompute({ unit: e.target.value }); }}
                className="h-11 rounded-[var(--radius-btn)] border border-line bg-surface px-3 text-[15px]"
              >
                {unitOptions(food, foodUnits, unit).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <div className="flex items-center gap-1.5">
                <label htmlFor="edit-grams" className="text-xs text-ink-2">وزن</label>
                <input
                  id="edit-grams"
                  inputMode="numeric"
                  value={grams == null ? "" : toPersianDigits(grams)}
                  placeholder="گرم"
                  onChange={(e) => {
                    const n = Number(toLatinDigits(e.target.value));
                    setGrams(Number.isFinite(n) && n > 0 ? n : null);
                  }}
                  className={`tabular h-11 w-20 rounded-[var(--radius-btn)] border bg-surface px-2 text-center text-[15px] ${grams == null ? "border-fat" : "border-line"}`}
                />
                <span className="text-xs text-ink-2">گرم</span>
              </div>
            </div>
            {grams == null && <p className="text-xs text-fat-ink">برای این واحد وزن را بنویس.</p>}
          </div>

          <dl className="tabular grid grid-cols-4 gap-1 rounded-[var(--radius-card)] bg-surface py-3 text-center text-xs">
            <div><dt className="text-ink-2">کالری</dt><dd className="text-lg font-bold">{mac ? `${est ? "≈" : ""}${faInt(mac.kcal)}` : "—"}</dd></div>
            <div><dt className="text-ink-2">پروتئین</dt><dd className="text-lg font-bold text-purple-ink">{mac ? faInt(mac.protein_g) : "—"}</dd></div>
            <div><dt className="text-ink-2">کربو</dt><dd className="text-lg font-bold text-carbs">{mac ? faInt(mac.carbs_g) : "—"}</dd></div>
            <div><dt className="text-ink-2">چربی</dt><dd className="text-lg font-bold text-fat-ink">{mac ? faInt(mac.fat_g) : "—"}</dd></div>
          </dl>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
        </div>

        <footer className="flex gap-2 border-t border-line bg-surface px-4 pt-3 pb-3">
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="flex h-12 items-center gap-1.5 rounded-[var(--radius-btn)] border border-line px-4 text-[15px] font-medium text-ink-2 transition-colors duration-150 hover:border-error hover:text-error disabled:opacity-45"
          >
            <Trash2 size={18} strokeWidth={1.75} aria-hidden />
            حذف
          </button>
          <button
            type="button"
            disabled={!ready || !changed || saving}
            onClick={() => grams && onSave({ food, qty, unit, grams, is_estimated: est })}
            className="h-12 flex-1 rounded-[var(--radius-btn)] bg-green-ink text-[15px] font-semibold text-surface transition-opacity duration-150 disabled:opacity-45"
          >
            {saving ? "در حال ذخیره…" : changed ? "ذخیره تغییر" : "تغییری نداده‌ای"}
          </button>
        </footer>
      </div>
    </div>
  );
}
