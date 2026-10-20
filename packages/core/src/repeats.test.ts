import { macrosForGrams } from "./calc";
import { chelo, item, oil } from "./fixtures.test-helpers";
import type { ReportItem } from "./report";
import { mealSlot, suggestRepeats } from "./repeats";

const at = (food: typeof chelo, meal: ReportItem["meal_type"], g = 100) => item(food, g, macrosForGrams(food, g), { meal_type: meal });

describe("mealSlot", () => {
  it("maps hours to slots", () => {
    expect(mealSlot(8)).toBe("breakfast");
    expect(mealSlot(13)).toBe("lunch");
    expect(mealSlot(17)).toBe("snack");
    expect(mealSlot(21)).toBe("dinner");
    expect(mealSlot(2)).toBe("dinner");
  });
});

describe("suggestRepeats", () => {
  const history = {
    "2026-10-17": [at(chelo, "lunch"), at(oil, "lunch", 10)],
    "2026-10-18": [at(chelo, "lunch"), at(oil, "lunch", 10), at(chelo, "breakfast", 50)],
    "2026-10-19": [at(chelo, "breakfast", 80), at(oil, "dinner", 5)],
  };

  it("puts yesterday's meal for the current slot first, with yesterday's amounts", () => {
    const r = suggestRepeats({ history, today: "2026-10-20", hour: 8 });
    expect(r[0]?.yesterday).toBe(true);
    expect(r[0]?.meal_type).toBe("breakfast");
    expect(r[0]?.items[0]?.grams).toBe(80);
    expect(r[0]?.count).toBe(2);
  });

  it("keeps frequent meals from other slots and drops one-offs", () => {
    const r = suggestRepeats({ history, today: "2026-10-20", hour: 8 });
    expect(r.map((m) => m.meal_type)).toEqual(["breakfast", "lunch"]);
  });

  it("stops pushing the current slot once it is logged today", () => {
    const r = suggestRepeats({ history: { ...history, "2026-10-20": [at(oil, "breakfast", 5)] }, today: "2026-10-20", hour: 8 });
    expect(r.some((m) => m.yesterday)).toBe(false);
    expect(r[0]?.meal_type).toBe("breakfast"); // still offered: it is frequent (2 days)
  });

  it("hides meals already logged today", () => {
    const r = suggestRepeats({ history: { ...history, "2026-10-20": [at(chelo, "breakfast", 60)] }, today: "2026-10-20", hour: 8 });
    expect(r.some((m) => m.meal_type === "breakfast")).toBe(false);
  });
});
