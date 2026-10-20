import { macrosForGrams, sumMacros, toGrams, UnitResolutionError, ZERO_MACRO, type Food, type Macro, type PortionUnit } from "@nutivo/core";
import type { DraftItem } from "./draft";

/** Re-resolve grams after the user changes qty, unit or food. Keeps grams null when the unit is unknown. */
export function regram(item: DraftItem, food: Food | undefined, units: PortionUnit[]): Pick<DraftItem, "grams" | "is_estimated"> {
  if (!food) return { grams: null, is_estimated: item.is_estimated };
  try {
    const g = toGrams(item.qty, item.unit, food, units);
    return { grams: Math.round(g.grams), is_estimated: item.from_photo || g.is_estimated };
  } catch (err) {
    if (err instanceof UnitResolutionError) return { grams: null, is_estimated: item.is_estimated };
    throw err;
  }
}

export function itemMacros(item: DraftItem, foods: Record<string, Food>): Macro {
  const f = item.food_id ? foods[item.food_id] : undefined;
  if (!f || item.grams == null) return ZERO_MACRO;
  return macrosForGrams(f, item.grams);
}

export function draftTotals(items: DraftItem[], foods: Record<string, Food>): Macro {
  return sumMacros(items.map((i) => itemMacros(i, foods)));
}

export function unitOptions(food: Food | undefined, units: PortionUnit[], current: string): string[] {
  const list = ["گرم", ...units.map((u) => u.unit_fa)];
  if (food && !list.includes(current)) list.push(current);
  return [...new Set(list)];
}
