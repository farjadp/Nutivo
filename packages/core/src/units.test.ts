import { toGrams, UnitResolutionError, unitKey } from "./units";
import { chelo, oil, units } from "./fixtures.test-helpers";
import { ZWNJ } from "./persian";

describe("toGrams", () => {
  it("treats گرم / g as exact, with Persian digits in qty", () => {
    expect(toGrams("۲۵۰", "گرم", chelo, units)).toEqual({ grams: 250, resolution: "exact", is_estimated: false });
    expect(toGrams(100, "g", chelo, units).resolution).toBe("exact");
    expect(toGrams("۱٫۵", "کیلوگرم", chelo, units).grams).toBe(1500);
  });

  it("uses the food's portion unit, tolerant of Arabic kaf and spacing", () => {
    expect(toGrams(2, "کفگیر", chelo, units)).toEqual({ grams: 240, resolution: "default_unit", is_estimated: false });
    expect(toGrams(1, "كفگير", chelo, units).grams).toBe(120); // Arabic ك ي
    expect(toGrams(1, " بشقاب ", chelo, units).grams).toBe(250);
    expect(toGrams(1, "Plate", chelo, units).grams).toBe(250);
  });

  it("falls back to generic estimates with ZWNJ / space variants", () => {
    const a = toGrams(1, "قاشق غذاخوری", oil, units);
    expect(a).toEqual({ grams: 15, resolution: "estimated_range", is_estimated: true });
    expect(toGrams(2, `قاشق${ZWNJ}چای${ZWNJ}خوری`, oil, units).grams).toBe(10);
    expect(toGrams(2, "قاشق چای خوری", oil, units).grams).toBe(10);
    expect(toGrams(1, "لیوان", oil, units).grams).toBe(240);
  });

  it("prefers the food's own unit over a generic fallback", () => {
    const withGlass = [...units, { food_id: "oil", unit_fa: "لیوان", unit_en: "glass", grams_default: 220, grams_min: 200, grams_max: 240 }];
    expect(toGrams(1, "لیوان", oil, withGlass).resolution).toBe("default_unit");
    expect(toGrams(1, "لیوان", oil, withGlass).grams).toBe(220);
  });

  it("throws a typed error with a Persian question for unknown units", () => {
    let err: unknown;
    try {
      toGrams(1, "سیخ", chelo, units);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(UnitResolutionError);
    const e = err as UnitResolutionError;
    expect(e.code).toBe("UNIT_UNRESOLVED");
    expect(e.question).toContain("سیخ");
    expect(e.question).toContain("چلو");
    expect(e.question).toContain("کفگیر");
    expect(e.known_units).toContain("گرم");
  });

  it("unitKey collapses ZWNJ, spaces and case", () => {
    expect(unitKey(`قاشق${ZWNJ}غذاخوری`)).toBe(unitKey("قاشق غذا خوری"));
    expect(unitKey("TBSP")).toBe("tbsp");
  });
});

describe("unit synonyms", () => {
  it("«تکه» uses the food's «برش» and is marked estimated", () => {
    const bread = { ...chelo, id: "bread" };
    const u = [{ food_id: "bread", unit_fa: "برش", unit_en: "slice", grams_default: 70, grams_min: 50, grams_max: 100 }];
    const g = toGrams(1, "تکه", bread, u);
    expect(g.grams).toBe(70);
    expect(g.is_estimated).toBe(true);
  });
});
