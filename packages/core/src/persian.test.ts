import { toPersianDigits, toLatinDigits, normalizeFa, searchFa, formatGrams, formatKcal, ZWNJ } from "./persian";

describe("persian", () => {
  it("converts digits both ways", () => {
    expect(toPersianDigits(1234)).toBe("۱۲۳۴");
    expect(toPersianDigits("2.5 g")).toBe("۲.۵ g");
    expect(toLatinDigits("۲۵۰")).toBe("250");
    expect(toLatinDigits("٢٥٠")).toBe("250"); // Arabic-Indic
  });

  it("normalises Arabic letters, digits and spaces", () => {
    expect(normalizeFa("  كباب   كوبيده  ٢  سيخ ")).toBe("کباب کوبیده 2 سیخ");
    expect(normalizeFa(`قاشق${ZWNJ}چای${ZWNJ}خوری`)).toBe(`قاشق${ZWNJ}چای${ZWNJ}خوری`);
  });

  it("maps spoken words to written ones for search, whole words only", () => {
    expect(searchFa("نون")).toBe("نان");
    expect(searchFa("نون بربری")).toBe("نان بربری");
    expect(searchFa("چایی")).toBe("چای");
    expect(searchFa("نونوایی")).toBe("نونوایی");
  });

  it("formats grams and kcal with Persian digits", () => {
    expect(formatGrams(200)).toBe("۲۰۰ گرم");
    expect(formatGrams(12.34)).toBe("۱۲٫۳ گرم");
    expect(formatKcal(480.4)).toBe("۴۸۰ کیلوکالری");
  });
});
