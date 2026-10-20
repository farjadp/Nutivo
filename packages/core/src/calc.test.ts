import {
  macrosForGrams,
  applyCookedFactor,
  gramsInFoodState,
  sumMacros,
  dayTotals,
  kcalFromMacros,
  kcalDiscrepancy,
  roundMacro,
} from "./calc";
import { riceRaw, chelo, item } from "./fixtures.test-helpers";

describe("calc", () => {
  it("scales per100g linearly", () => {
    expect(macrosForGrams(chelo, 200)).toEqual({ kcal: 260, protein_g: 5.4, carbs_g: 56, fat_g: 0.6 });
  });

  it("applies cooked factor in both directions", () => {
    expect(applyCookedFactor(riceRaw, 100, "raw")).toBe(250); // 100 g raw → 250 g cooked
    expect(applyCookedFactor(riceRaw, 250, "cooked")).toBe(100); // 250 g cooked → 100 g raw
  });

  it("converts a stated weight to the food's own state before scaling", () => {
    // user ate 250 g cooked rice, food table is raw → 100 g raw → 360 kcal
    const g = gramsInFoodState(riceRaw, 250, "cooked");
    expect(g).toBe(100);
    expect(macrosForGrams(riceRaw, g).kcal).toBe(360);
    expect(gramsInFoodState(riceRaw, 100, "raw")).toBe(100);
    expect(gramsInFoodState(chelo, 200, "as_served")).toBe(200);
  });

  it("sums macros", () => {
    expect(sumMacros([macrosForGrams(chelo, 100), macrosForGrams(chelo, 100)])).toEqual(macrosForGrams(chelo, 200));
    expect(sumMacros([])).toEqual({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it("dayTotals: remaining goes negative and pct exceeds 1 when over goal", () => {
    const goals = { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 60 };
    const items = [item(chelo, 1000, macrosForGrams(chelo, 1000)), item(chelo, 1000, macrosForGrams(chelo, 1000))];
    const t = dayTotals(items, goals);
    expect(t.macros.kcal).toBe(2600);
    expect(t.remaining.kcal).toBe(-600);
    expect(t.remaining.carbs_g).toBeCloseTo(200 - 560);
    expect(t.pct.kcal).toBeCloseTo(1.3);
    expect(t.pct.protein).toBeCloseTo(54 / 150);
  });

  it("dayTotals handles zero goals without dividing by zero", () => {
    const t = dayTotals([item(chelo, 100, macrosForGrams(chelo, 100))], { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    expect(t.pct.kcal).toBe(0);
    expect(t.remaining.kcal).toBe(-130);
  });

  it("kcal discrepancy", () => {
    expect(kcalFromMacros({ protein_g: 10, carbs_g: 20, fat_g: 10 })).toBe(210);
    const d = kcalDiscrepancy({ kcal: 220, protein_g: 10, carbs_g: 20, fat_g: 10 });
    expect(d).toEqual({ expected: 210, reported: 220, delta: 10, delta_pct: 10 / 210 });
    expect(kcalDiscrepancy({ kcal: 5, protein_g: 0, carbs_g: 0, fat_g: 0 }).delta_pct).toBe(0);
  });

  it("rounds kcal to integer and grams to 1 decimal", () => {
    expect(roundMacro({ kcal: 259.6, protein_g: 5.44, carbs_g: 55.95, fat_g: 0.04 })).toEqual({
      kcal: 260,
      protein_g: 5.4,
      carbs_g: 56,
      fat_g: 0,
    });
  });
});
