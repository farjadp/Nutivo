import { macrosForGrams } from "../calc";
import { chelo, item, oil } from "../fixtures.test-helpers";
import { buildDailyReport, reportFacts } from "../report";
import { allowedNumbers, groupThousands, guardNumbers } from "./report";

const goals = { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 60 };
const day = (grams: number) =>
  buildDailyReport({
    date: "2026-10-20",
    goals,
    items: [
      item(chelo, grams, macrosForGrams(chelo, grams), { meal_type: "lunch" }),
      item(oil, 15, macrosForGrams(oil, 15), { meal_type: "dinner" }),
    ],
  });

describe("reportFacts", () => {
  it("classifies calories against a ±10% band and names the heaviest meal", () => {
    const f = reportFacts(day(300), goals);
    expect(f.kcal.status).toBe("under");
    expect(f.kcal.low).toBe(1800);
    expect(f.kcal.high).toBe(2200);
    expect(f.heaviest_meal?.meal_type).toBe("lunch");
    expect(f.top_fat[0]?.name).toBe(oil.name_fa);
    expect(f.protein.enough).toBe(false);
    expect(f.energy_split.carbs + f.energy_split.protein + f.energy_split.fat).toBeCloseTo(1);
  });

  it("reports over and in-range days", () => {
    expect(reportFacts(day(1700), goals).kcal.status).toBe("over");
    expect(reportFacts(day(1300), goals).kcal.status).toBe("in_range");
  });

  it("handles an empty day", () => {
    const f = reportFacts(buildDailyReport({ date: "d", items: [], goals }), goals);
    expect(f.logged).toBe(false);
    expect(f.heaviest_meal).toBeNull();
    expect(f.kcal_mismatch).toBeNull();
  });
});

describe("guardNumbers", () => {
  const f = reportFacts(day(300), goals);
  const allowed = allowedNumbers(f);

  it("keeps sentences that cite engine numbers, Persian digits included", () => {
    const kcal = String(f.kcal.consumed).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
    const { kept, dropped } = guardNumbers([`امروز ${kcal} کالری دریافت کرده‌ای.`, "فردا دو تخم‌مرغ به صبحانه اضافه کن."], allowed);
    expect(kept).toHaveLength(2);
    expect(dropped).toHaveLength(0);
  });

  it("drops sentences with invented numbers", () => {
    const { kept, dropped } = guardNumbers(["یک سیخ جوجه حدود ۳۶ گرم پروتئین دارد."], allowed);
    expect(kept).toHaveLength(0);
    expect(dropped).toHaveLength(1);
  });
});

describe("groupThousands", () => {
  it("adds the Persian separator to long integers only", () => {
    expect(groupThousands("کالری ۱۰۵۹ بود و ۷۱ گرم")).toBe("کالری ۱٬۰۵۹ بود و ۷۱ گرم");
    expect(groupThousands("۱٬۹۰۰ و ۲۰۲۶")).toBe("۱٬۹۰۰ و ۲٬۰۲۶");
    expect(groupThousands("هدف 105 گرمی و 1596 کالری")).toBe("هدف ۱۰۵ گرمی و ۱٬۵۹۶ کالری");
  });
});
