import type { Macro, MealType } from "./schemas";

/**
 * Curated Iranian meal ideas built from reviewed seed foods (packages/db/seed).
 * Only ids and amounts live here; the app computes nutrition from the food table.
 */
export interface IdeaItem {
  food_id: string;
  qty: number;
  unit: string;
  grams: number;
}

export interface MealIdea {
  id: string;
  name_fa: string;
  slots: MealType[];
  items: IdeaItem[];
}

const i = (food_id: string, qty: number, unit: string, grams: number): IdeaItem => ({ food_id, qty, unit, grams });

export const MEAL_IDEAS: MealIdea[] = [
  { id: "jujeh-salad", name_fa: "جوجه‌کباب با سالاد شیرازی", slots: ["lunch", "dinner"], items: [i("fa:jujeh-kabab", 1, "سیخ", 120), i("fa:salad-shirazi", 1, "کاسه", 150)] },
  { id: "jujeh-chelo", name_fa: "جوجه‌کباب با یک کفگیر چلو", slots: ["lunch", "dinner"], items: [i("fa:jujeh-kabab", 1, "سیخ", 120), i("fa:chelo", 1, "کفگیر", 100), i("fa:salad-shirazi", 1, "کاسه", 150)] },
  { id: "morgh-salad", name_fa: "مرغ گریل با سالاد", slots: ["lunch", "dinner"], items: [i("fa:morgh-grill-sineh", 1, "تکه", 120), i("fa:salad-shirazi", 1, "کاسه", 150)] },
  { id: "kubideh-lavash", name_fa: "یک سیخ کوبیده با لواش و گوجه", slots: ["lunch", "dinner"], items: [i("fa:kabab-kubideh", 1, "سیخ", 80), i("fa:nan-lavash", 1, "عدد", 40), i("fa:gojeh", 1, "عدد", 120)] },
  { id: "ghormeh-light", name_fa: "قورمه‌سبزی با یک کفگیر چلو", slots: ["lunch", "dinner"], items: [i("fa:ghormeh-sabzi", 1, "کاسه", 250), i("fa:chelo", 1, "کفگیر", 100)] },
  { id: "adasi-nan", name_fa: "یک کاسه عدسی با کمی نان", slots: ["breakfast", "lunch", "dinner"], items: [i("fa:adasi", 1, "کاسه", 250), i("fa:nan-sangak", 1, "کف دست", 30)] },
  { id: "egg-sangak", name_fa: "دو تخم‌مرغ با نان سنگک و گوجه", slots: ["breakfast", "dinner"], items: [i("fa:tokhm-morgh", 2, "عدد", 100), i("fa:nan-sangak", 1, "برش", 60), i("fa:gojeh", 1, "عدد", 120)] },
  { id: "nan-panir-gerdu", name_fa: "نان و پنیر و گردو", slots: ["breakfast", "snack"], items: [i("fa:nan-sangak", 1, "برش", 60), i("fa:panir-feta", 1, "برش", 30), i("fa:gerdu", 4, "عدد", 16)] },
  { id: "mast-khiar", name_fa: "ماست و خیار", slots: ["snack", "dinner"], items: [i("fa:mast", 1, "کاسه", 150), i("fa:khiar", 1, "عدد", 120)] },
  { id: "two-eggs", name_fa: "دو تخم‌مرغ آب‌پز", slots: ["snack", "breakfast"], items: [i("fa:tokhm-morgh", 2, "عدد", 100)] },
  { id: "khorma-gerdu", name_fa: "دو خرما با چند گردو", slots: ["snack"], items: [i("fa:khorma", 2, "عدد", 48), i("fa:gerdu", 3, "عدد", 12)] },
  { id: "mast-dugh-salad", name_fa: "سالاد شیرازی با یک لیوان دوغ", slots: ["snack", "dinner"], items: [i("fa:salad-shirazi", 1, "کاسه", 150), i("fa:dugh", 1, "لیوان", 250)] },
];

export interface IdeaCandidate {
  id: string;
  name_fa: string;
  source: "idea" | "history";
  slots: MealType[];
  macros: Macro;
}

export interface RankInput {
  candidates: IdeaCandidate[];
  remaining: { kcal: number; protein_g: number };
  slot: MealType;
  limit?: number;
}

/** How much of the remaining calories this slot should take. Dinner may use all of it. */
const SLOT_SHARE: Record<MealType, number> = { breakfast: 0.3, lunch: 0.45, snack: 0.2, dinner: 1 };

/**
 * Ranks candidates for "what should I eat now": fits the remaining calories for this slot,
 * closes the protein gap, prefers the user's own meals, and never suggests something that
 * pushes the day over its calorie goal when there is still room.
 */
export function rankIdeas({ candidates, remaining, slot, limit = 3 }: RankInput): (IdeaCandidate & { score: number })[] {
  const room = Math.max(0, remaining.kcal);
  const target = Math.max(150, Math.min(room, room * SLOT_SHARE[slot] + (slot === "dinner" ? 0 : 100)));
  const proteinNeed = Math.max(0, remaining.protein_g);

  const scored = candidates.map((c) => {
    let s = 0;
    s -= Math.abs(c.macros.kcal - target) / Math.max(target, 150);
    if (room > 0 && c.macros.kcal > room + 50) s -= 2;
    if (room <= 0) s -= c.macros.kcal / 400; // goal reached: lighter is better
    if (proteinNeed > 15) s += (Math.min(c.macros.protein_g, proteinNeed) / proteinNeed) * 1.5;
    s += c.slots.includes(slot) ? 0.6 : -0.4;
    if (c.source === "history") s += 0.3;
    return { ...c, score: s };
  });

  // Distinct names, best first.
  const seen = new Set<string>();
  return scored
    .sort((a, b) => b.score - a.score)
    .filter((c) => (seen.has(c.name_fa) ? false : (seen.add(c.name_fa), true)))
    .slice(0, limit);
}
