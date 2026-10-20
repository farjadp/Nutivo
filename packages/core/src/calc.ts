import type { DayTotals, Food, FoodState, Goals, Macro, ResolvedItem } from "./schemas";

export const ZERO_MACRO: Readonly<Macro> = Object.freeze({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

/** Macros for `grams` of `food`, scaled linearly from `food.per100g` (which describes `food.state`). */
export function macrosForGrams(food: Food, grams: number): Macro {
  const f = grams / 100;
  return {
    kcal: food.per100g.kcal * f,
    protein_g: food.per100g.protein_g * f,
    carbs_g: food.per100g.carbs_g * f,
    fat_g: food.per100g.fat_g * f,
  };
}

/**
 * Convert a weight between raw and cooked using `food.cooked_factor`.
 *
 * Convention: `cooked_factor` = grams of cooked food per gram of raw food.
 * Rice ≈ 2.5–3 (absorbs water), meat ≈ 0.7 (loses water), 1 = no change.
 *
 * - `from: 'raw'`   → returns the cooked weight (grams × cooked_factor).
 * - `from: 'cooked'` → returns the raw weight (grams ÷ cooked_factor).
 */
export function applyCookedFactor(food: Food, grams: number, from: "raw" | "cooked"): number {
  return from === "raw" ? grams * food.cooked_factor : grams / food.cooked_factor;
}

/**
 * Convert a weight stated in `statedState` to the state that `food.per100g` describes,
 * so it can be passed to `macrosForGrams`. `as_served` is treated as the food's own state.
 */
export function gramsInFoodState(food: Food, grams: number, statedState: FoodState): number {
  const target = food.state;
  if (statedState === target || statedState === "as_served" || target === "as_served") return grams;
  return applyCookedFactor(food, grams, statedState);
}

export function sumMacros(list: readonly Macro[]): Macro {
  return list.reduce<Macro>(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein_g: acc.protein_g + m.protein_g,
      carbs_g: acc.carbs_g + m.carbs_g,
      fat_g: acc.fat_g + m.fat_g,
    }),
    { ...ZERO_MACRO },
  );
}

/** Consumed vs goals. `remaining` goes negative when over; `pct` exceeds 1 when over. */
export function dayTotals(items: readonly ResolvedItem[], goals: Goals): DayTotals {
  const macros = sumMacros(items.map((i) => i.macros));
  const pct = (consumed: number, goal: number) => (goal > 0 ? consumed / goal : 0);
  return {
    macros,
    remaining: {
      kcal: goals.kcal - macros.kcal,
      protein_g: goals.protein_g - macros.protein_g,
      carbs_g: goals.carbs_g - macros.carbs_g,
      fat_g: goals.fat_g - macros.fat_g,
    },
    pct: {
      kcal: pct(macros.kcal, goals.kcal),
      protein: pct(macros.protein_g, goals.protein_g),
      carbs: pct(macros.carbs_g, goals.carbs_g),
      fat: pct(macros.fat_g, goals.fat_g),
    },
  };
}

/** Atwater: 4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat. */
export function kcalFromMacros(m: Pick<Macro, "protein_g" | "carbs_g" | "fat_g">): number {
  return 4 * m.protein_g + 4 * m.carbs_g + 9 * m.fat_g;
}

export interface KcalDiscrepancy {
  /** kcal implied by the macro grams. */
  expected: number;
  /** kcal as stored. */
  reported: number;
  /** reported − expected. */
  delta: number;
  /** delta / expected; 0 when expected is 0. */
  delta_pct: number;
}

/** Rounding / data-quality check: how far the stored kcal is from the Atwater estimate. */
export function kcalDiscrepancy(m: Macro): KcalDiscrepancy {
  const expected = kcalFromMacros(m);
  const delta = m.kcal - expected;
  return { expected, reported: m.kcal, delta, delta_pct: expected > 0 ? delta / expected : 0 };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Integer kcal, grams to 1 decimal. */
export function roundMacro(m: Macro): Macro {
  return {
    kcal: Math.round(m.kcal),
    protein_g: round1(m.protein_g),
    carbs_g: round1(m.carbs_g),
    fat_g: round1(m.fat_g),
  };
}
