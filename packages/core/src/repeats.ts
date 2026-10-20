import type { MealType } from "./schemas";
import type { ReportItem } from "./report";

/** Meal slot for a local hour: what the user is most likely about to eat. */
export function mealSlot(hour: number): MealType {
  if (hour >= 4 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 19) return "snack";
  return "dinner";
}

export interface RepeatMeal {
  /** Stable id: meal type + the set of foods. */
  id: string;
  meal_type: MealType;
  /** Items as eaten the most recent time (amounts included). */
  items: ReportItem[];
  /** Distinct days this exact meal was logged in the history window. */
  count: number;
  last_date: string;
  /** Yesterday's meal for the current slot ("copy yesterday's breakfast"). */
  yesterday: boolean;
}

export interface SuggestRepeatsInput {
  /** Logged items by local date (YYYY-MM-DD). Today may be included. */
  history: Readonly<Record<string, readonly ReportItem[]>>;
  today: string;
  /** Local hour 0–23. */
  hour: number;
  limit?: number;
}

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

/**
 * One-tap repeats from the user's own history, ranked for this moment:
 * yesterday's meal for the current slot first, then same-slot meals by frequency and recency,
 * then other frequent meals. Meals already logged today are left out.
 */
export function suggestRepeats({ history, today, hour, limit = 6 }: SuggestRepeatsInput): RepeatMeal[] {
  const slot = mealSlot(hour);
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - DAY).toISOString().slice(0, 10);
  const loggedToday = new Set<string>();
  // Once the current slot has a meal today, "yesterday's lunch" is no longer the obvious next tap.
  const slotTaken = (history[today] ?? []).some((i) => i.meal_type === slot);
  const byId = new Map<string, RepeatMeal>();

  for (const date of Object.keys(history).sort()) {
    if (date > today) continue;
    const meals = new Map<MealType, ReportItem[]>();
    for (const it of history[date] ?? []) (meals.get(it.meal_type) ?? meals.set(it.meal_type, []).get(it.meal_type)!).push(it);
    for (const [meal_type, items] of meals) {
      const id = `${meal_type}:${[...new Set(items.map((i) => i.food.id))].sort().join("+")}`;
      if (date === today) {
        loggedToday.add(id);
        continue;
      }
      const prev = byId.get(id);
      // Dates are visited in order, so the latest occurrence wins the amounts.
      byId.set(id, { id, meal_type, items, count: (prev?.count ?? 0) + 1, last_date: date, yesterday: !slotTaken && date === yesterday && meal_type === slot });
    }
  }

  const score = (m: RepeatMeal) =>
    (m.yesterday ? 10_000 : 0) + (m.meal_type === slot && !slotTaken ? 1_000 : 0) + Math.min(m.count, 20) * 20 - Math.min(daysBetween(m.last_date, today), 30);

  return [...byId.values()]
    .filter((m) => !loggedToday.has(m.id))
    // A one-off meal from another slot is noise; keep it only when it is for now or repeated.
    .filter((m) => m.yesterday || (m.meal_type === slot && !slotTaken) || m.count >= 2)
    .sort((a, b) => score(b) - score(a) || b.last_date.localeCompare(a.last_date))
    .slice(0, limit);
}
