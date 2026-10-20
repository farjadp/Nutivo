import { buildDailyReport, streakStatus } from "./report";
import { macrosForGrams } from "./calc";
import { chelo, oil, riceRaw, item } from "./fixtures.test-helpers";

const goals = { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 60 };

describe("buildDailyReport", () => {
  it("groups meals in order, finds heaviest meal and top sources", () => {
    const items = [
      item(chelo, 100, macrosForGrams(chelo, 100), { meal_type: "dinner" }),
      item(chelo, 300, macrosForGrams(chelo, 300), { meal_type: "lunch" }),
      item(oil, 15, macrosForGrams(oil, 15), { meal_type: "lunch" }),
      item(chelo, 50, macrosForGrams(chelo, 50), { meal_type: "breakfast" }),
    ];
    const r = buildDailyReport({ date: "2026-10-20", items, goals });
    expect(r.per_meal.map((m) => m.meal_type)).toEqual(["breakfast", "lunch", "dinner"]);
    expect(r.heaviest_meal).toBe("lunch");
    expect(r.per_meal[1]?.macros.kcal).toBeCloseTo(390 + 132.6);
    expect(r.top_fat_sources[0]?.food.id).toBe("oil");
    expect(r.top_kcal_sources.map((i) => i.grams)).toEqual([300, 15, 100]);
    expect(r.is_partial).toBe(false);
    expect(r.totals.remaining.kcal).toBeCloseTo(2000 - (585 + 132.6));
    expect(r.discrepancy.reported).toBeCloseTo(r.totals.macros.kcal);
  });

  it("is_partial when any item is estimated or low confidence", () => {
    const base = item(chelo, 100, macrosForGrams(chelo, 100));
    expect(buildDailyReport({ date: "d", items: [{ ...base, is_estimated: true }], goals }).is_partial).toBe(true);
    expect(buildDailyReport({ date: "d", items: [{ ...base, confidence: "low" }], goals }).is_partial).toBe(true);
    expect(buildDailyReport({ date: "d", items: [{ ...base, confidence: "medium" }], goals }).is_partial).toBe(false);
  });

  it("handles an empty day", () => {
    const r = buildDailyReport({ date: "d", items: [], goals });
    expect(r.heaviest_meal).toBeNull();
    expect(r.per_meal).toEqual([]);
    expect(r.totals.remaining).toEqual({ kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 60 });
    expect(riceRaw.cooked_factor).toBe(2.5);
  });
});

describe("streakStatus", () => {
  const today = "2026-10-20";
  const d = (n: number) => new Date(Date.UTC(2026, 9, 20 - n)).toISOString().slice(0, 10);

  it("counts consecutive logged days including today", () => {
    expect(streakStatus({ logDates: [d(2), d(1), d(0)], today })).toEqual({ current: 3, longest: 3, forgiven_today: false });
  });

  it("one missed day inside the week keeps the streak", () => {
    const s = streakStatus({ logDates: [d(4), d(3), d(1), d(0)], today });
    expect(s.current).toBe(4);
    expect(s.forgiven_today).toBe(false);
  });

  it("two missed days inside the week break it", () => {
    const s = streakStatus({ logDates: [d(5), d(4), d(1), d(0)], today });
    expect(s.current).toBe(2);
    expect(s.longest).toBe(2);
  });

  it("two misses more than a week apart are both forgiven", () => {
    const logs = Array.from({ length: 14 }, (_, i) => d(i)).filter((x) => x !== d(10) && x !== d(2));
    expect(streakStatus({ logDates: logs, today }).current).toBe(12);
  });

  it("today not logged yet: streak alive, forgiven_today true", () => {
    const s = streakStatus({ logDates: [d(3), d(2), d(1)], today });
    expect(s).toEqual({ current: 3, longest: 3, forgiven_today: true });
  });

  it("today not logged and grace already used: streak at risk, not forgiven", () => {
    const s = streakStatus({ logDates: [d(4), d(3), d(1)], today }); // missed d2; today still open
    expect(s.current).toBe(3);
    expect(s.forgiven_today).toBe(false);
    expect(s.longest).toBe(3);
  });

  it("yesterday and the day before missed: streak is dead regardless of today", () => {
    const s = streakStatus({ logDates: [d(5), d(4), d(3)], today });
    expect(s.current).toBe(0);
    expect(s.forgiven_today).toBe(false);
    expect(s.longest).toBe(3);
  });

  it("longest remembers an older run", () => {
    const logs = [d(20), d(19), d(18), d(17), d(16), d(15), d(3), d(2), d(0)];
    const s = streakStatus({ logDates: logs, today });
    expect(s.current).toBe(3);
    expect(s.longest).toBe(6);
  });

  it("empty and duplicate inputs", () => {
    expect(streakStatus({ logDates: [], today })).toEqual({ current: 0, longest: 0, forgiven_today: false });
    expect(streakStatus({ logDates: [d(0), `${d(0)}T18:00:00Z`], today }).current).toBe(1);
  });
});
