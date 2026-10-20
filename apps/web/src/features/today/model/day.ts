import { dayTotals, sumMacros, MEAL_ORDER, type Goals, type Macro, type MealType } from "@nutivo/core";
import type { LoggedItem } from "@/entities/day/sample";

export interface MealGroup {
  meal_type: MealType;
  items: LoggedItem[];
  macros: Macro;
  hasEstimate: boolean;
}

export function groupMeals(items: LoggedItem[]): MealGroup[] {
  return MEAL_ORDER.map((meal_type) => {
    const list = items.filter((i) => i.meal_type === meal_type);
    return { meal_type, items: list, macros: sumMacros(list.map((i) => i.macros)), hasEstimate: list.some((i) => i.is_estimated) };
  });
}

export function estimatedMacros(items: LoggedItem[]): Macro {
  return sumMacros(items.filter((i) => i.is_estimated).map((i) => i.macros));
}

/** "Complete day": calories within ±10% of goal and protein at least 90% of goal. */
export function completeDay(items: LoggedItem[], goals: Goals) {
  const t = dayTotals(items, goals);
  const kcalOk = t.pct.kcal >= 0.9 && t.pct.kcal <= 1.1;
  const proteinOk = t.pct.protein >= 0.9;
  const loggedThree = new Set(items.map((i) => i.meal_type)).size >= 3;
  return { kcalOk, proteinOk, loggedThree, done: kcalOk && proteinOk && loggedThree, met: [kcalOk, proteinOk, loggedThree].filter(Boolean).length };
}
