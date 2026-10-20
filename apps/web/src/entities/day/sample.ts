/**
 * SAMPLE DATA for the Today preview until Supabase and Claude are wired.
 * Food values are copied from packages/db/seed/foods_fa.csv (USDA-derived, confidence medium/low).
 * Nothing here is the user's real intake.
 */
import { macrosForGrams, type Food, type Goals, type MealType, type ResolvedItem } from "@nutivo/core";

const food = (f: Omit<Food, "tags" | "name_en"> & { name_en?: string }): Food => ({ tags: [], name_en: f.name_en ?? "", ...f });

export const SAMPLE_FOODS = {
  sangak: food({ id: "fa:nan-sangak", name_fa: "نان سنگک", source: "fa_manual", per100g: { kcal: 262, protein_g: 9.8, carbs_g: 55.9, fat_g: 1.7 }, cooked_factor: 1, state: "as_served", confidence: "medium" }),
  panir: food({ id: "fa:panir-feta", name_fa: "پنیر لیقوان", source: "usda", per100g: { kcal: 265, protein_g: 14.2, carbs_g: 3.88, fat_g: 21.5 }, cooked_factor: 1, state: "as_served", confidence: "medium" }),
  gerdu: food({ id: "fa:gerdu", name_fa: "گردو", source: "usda", per100g: { kcal: 654, protein_g: 15.23, carbs_g: 13.71, fat_g: 65.21 }, cooked_factor: 1, state: "raw", confidence: "medium" }),
  egg: food({ id: "fa:tokhm-morgh", name_fa: "تخم‌مرغ آب‌پز", source: "usda", per100g: { kcal: 143, protein_g: 12.6, carbs_g: 0.72, fat_g: 9.51 }, cooked_factor: 1, state: "raw", confidence: "medium" }),
  chelo: food({ id: "fa:chelo", name_fa: "چلو", source: "fa_manual", per100g: { kcal: 155, protein_g: 2.7, carbs_g: 28.2, fat_g: 3.1 }, cooked_factor: 1, state: "as_served", confidence: "medium" }),
  chicken: food({ id: "fa:morgh-grill-sineh", name_fa: "مرغ گریل", source: "usda", per100g: { kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.57 }, cooked_factor: 0.75, state: "cooked", confidence: "medium" }),
  shirazi: food({ id: "fa:salad-shirazi", name_fa: "سالاد شیرازی", source: "fa_manual", per100g: { kcal: 37, protein_g: 0.8, carbs_g: 4.5, fat_g: 2.1 }, cooked_factor: 1, state: "as_served", confidence: "medium" }),
  khorma: food({ id: "fa:khorma", name_fa: "خرما", source: "usda", per100g: { kcal: 277, protein_g: 1.81, carbs_g: 74.97, fat_g: 0.15 }, cooked_factor: 1, state: "as_served", confidence: "medium" }),
  jujeh: food({ id: "fa:jujeh-kabab", name_fa: "جوجه‌کباب", source: "fa_manual", per100g: { kcal: 181, protein_g: 30, carbs_g: 0.5, fat_g: 6.5 }, cooked_factor: 0.75, state: "cooked", confidence: "medium" }),
  mast: food({ id: "fa:mast", name_fa: "ماست", source: "usda", per100g: { kcal: 61, protein_g: 3.47, carbs_g: 4.66, fat_g: 3.25 }, cooked_factor: 1, state: "as_served", confidence: "medium" }),
  khiar: food({ id: "fa:khiar", name_fa: "خیار", source: "usda", per100g: { kcal: 15, protein_g: 0.65, carbs_g: 3.63, fat_g: 0.11 }, cooked_factor: 1, state: "raw", confidence: "medium" }),
} satisfies Record<string, Food>;

export type LoggedItem = ResolvedItem & { meal_type: MealType; key: string };

let seq = 0;
export function item(
  meal_type: MealType,
  f: Food,
  qty: number,
  unit: string,
  grams: number,
  opts: { from_photo?: boolean; estimated?: boolean } = {},
): LoggedItem {
  const estimated = opts.estimated ?? opts.from_photo ?? false;
  return {
    key: `${f.id}-${seq++}`,
    meal_type,
    name_raw: f.name_fa,
    qty,
    unit,
    prep_hint: undefined,
    confidence: estimated ? "medium" : "high",
    needs_question: undefined,
    from_photo: opts.from_photo ?? false,
    food: f,
    grams,
    macros: macrosForGrams(f, grams),
    is_estimated: estimated,
    resolution: estimated ? "estimated_range" : unit === "گرم" ? "exact" : "default_unit",
  };
}

export const SAMPLE_TODAY = "2026-10-20";

export const SAMPLE_GOALS: Goals = { kcal: 1900, protein_g: 120, carbs_g: 200, fat_g: 60 };

const F = SAMPLE_FOODS;
export const SAMPLE_ITEMS: LoggedItem[] = [
  item("breakfast", F.sangak, 1, "برش", 60),
  item("breakfast", F.panir, 30, "گرم", 30),
  item("breakfast", F.gerdu, 3, "عدد", 20),
  item("breakfast", F.egg, 2, "عدد", 100),
  item("lunch", F.chelo, 2, "کفگیر", 200),
  item("lunch", F.chicken, 1, "تکه", 120),
  item("lunch", F.shirazi, 1, "کاسه", 150, { from_photo: true }),
  item("snack", F.khorma, 2, "عدد", 48),
];

/** Days with at least one confirmed entry. 16 Oct was missed and is forgiven by the weekly grace day. */
export const SAMPLE_LOG_DATES = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-17", "2026-10-18", "2026-10-19"];

export interface QuickMeal {
  id: string;
  label: string;
  meal_type: MealType;
  build: () => LoggedItem[];
  /** Food whose icon the chip shows; defaults to a lookup by label. */
  iconFood?: Food;
  /** "Yesterday's breakfast" style chip. */
  yesterday?: boolean;
}

export const SAMPLE_QUICK_MEALS: QuickMeal[] = [
  {
    id: "dinner-jujeh",
    label: "جوجه‌کباب با چلو",
    meal_type: "dinner",
    build: () => [item("dinner", F.jujeh, 1, "سیخ", 150), item("dinner", F.chelo, 1, "کفگیر", 100)],
  },
  {
    id: "mast-khiar",
    label: "ماست و خیار",
    meal_type: "snack",
    build: () => [item("snack", F.mast, 1, "کاسه", 150), item("snack", F.khiar, 1, "عدد", 120)],
  },
];

/** Fresh copy of today's sample items (new keys each call). */
export function sampleTodayItems(): LoggedItem[] {
  return [
    item("breakfast", F.sangak, 1, "برش", 60),
    item("breakfast", F.panir, 30, "گرم", 30),
    item("breakfast", F.gerdu, 3, "عدد", 20),
    item("breakfast", F.egg, 2, "عدد", 100),
    item("lunch", F.chelo, 2, "کفگیر", 200),
    item("lunch", F.chicken, 1, "تکه", 120),
    item("lunch", F.shirazi, 1, "کاسه", 150, { from_photo: true }),
    item("snack", F.khorma, 2, "عدد", 48),
  ];
}

/** Eight past days of sample history. One day (4 days ago) is missing so the weekly grace day shows. */
export function samplePastDays(today: string, addDays: (d: string, n: number) => string): Record<string, LoggedItem[]> {
  const days: Record<string, LoggedItem[]> = {};
  const menus: (() => LoggedItem[])[] = [
    () => [item("breakfast", F.egg, 2, "عدد", 100), item("lunch", F.chelo, 2, "کفگیر", 200), item("lunch", F.jujeh, 1, "سیخ", 120), item("dinner", F.mast, 1, "کاسه", 150)],
    () => [item("breakfast", F.sangak, 1, "برش", 60), item("breakfast", F.panir, 30, "گرم", 30), item("lunch", F.chelo, 3, "کفگیر", 300), item("lunch", F.chicken, 1, "تکه", 150)],
    () => [item("lunch", F.chelo, 2, "کفگیر", 200), item("lunch", F.shirazi, 1, "کاسه", 150), item("dinner", F.jujeh, 1, "سیخ", 120)],
  ];
  for (let n = 8; n >= 1; n--) {
    if (n === 4) continue;
    const d = addDays(today, -n);
    days[d] = menus[n % menus.length]!();
  }
  return days;
}
