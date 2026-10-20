import { FoodSchema, ParsedItemSchema, ParsedMealSchema, MacroSchema } from "./schemas";

describe("schemas", () => {
  it("rejects negative macros", () => {
    expect(MacroSchema.safeParse({ kcal: -1, protein_g: 0, carbs_g: 0, fat_g: 0 }).success).toBe(false);
  });

  it("defaults cooked_factor to 1 and tags to []", () => {
    const food = FoodSchema.parse({
      id: "egg",
      name_fa: "تخم‌مرغ",
      name_en: "egg",
      source: "fa_manual",
      per100g: { kcal: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11 },
      state: "cooked",
      confidence: "high",
    });
    expect(food.cooked_factor).toBe(1);
    expect(food.tags).toEqual([]);
  });

  it("defaults from_photo to false and validates meal_type", () => {
    const item = ParsedItemSchema.parse({ name_raw: "دو تا تخم مرغ", qty: 2, unit: "عدد", confidence: "high" });
    expect(item.from_photo).toBe(false);
    expect(ParsedMealSchema.safeParse({ meal_type: "brunch", items: [] }).success).toBe(false);
    expect(
      ParsedMealSchema.safeParse({ meal_type: "lunch", items: [item], eaten_at: "2026-10-20T12:30:00+03:30" }).success,
    ).toBe(true);
  });
});
