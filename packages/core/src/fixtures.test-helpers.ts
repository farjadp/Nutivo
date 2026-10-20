import type { Food, PortionUnit, ResolvedItem, MealType, Macro } from "./schemas";

export const riceRaw: Food = {
  id: "rice_raw",
  name_fa: "برنج خام",
  name_en: "rice, raw",
  source: "fa_manual",
  per100g: { kcal: 360, protein_g: 7, carbs_g: 79, fat_g: 0.6 },
  cooked_factor: 2.5,
  state: "raw",
  confidence: "high",
  tags: ["staple"],
};

export const chelo: Food = {
  id: "chelo",
  name_fa: "چلو",
  name_en: "steamed rice",
  source: "fa_manual",
  per100g: { kcal: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3 },
  cooked_factor: 1,
  state: "cooked",
  confidence: "high",
  tags: [],
};

export const oil: Food = {
  id: "oil",
  name_fa: "روغن",
  name_en: "vegetable oil",
  source: "usda",
  per100g: { kcal: 884, protein_g: 0, carbs_g: 0, fat_g: 100 },
  cooked_factor: 1,
  state: "as_served",
  confidence: "high",
  tags: [],
};

export const units: PortionUnit[] = [
  { food_id: "chelo", unit_fa: "کفگیر", unit_en: "spatula", grams_default: 120, grams_min: 90, grams_max: 160 },
  { food_id: "chelo", unit_fa: "بشقاب", unit_en: "plate", grams_default: 250, grams_min: 180, grams_max: 350 },
];

export function item(
  food: Food,
  grams: number,
  macros: Macro,
  extra: Partial<ResolvedItem> & { meal_type?: MealType } = {},
): ResolvedItem & { meal_type: MealType } {
  const { meal_type = "lunch", ...rest } = extra;
  return {
    name_raw: food.name_fa,
    qty: grams,
    unit: "گرم",
    confidence: "high",
    from_photo: false,
    food,
    grams,
    macros,
    is_estimated: false,
    resolution: "exact",
    meal_type,
    ...rest,
  };
}
