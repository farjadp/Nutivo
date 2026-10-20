import { FoodSchema, PortionUnitSchema, type Food, type PortionUnit } from "@nutivo/core";
import { z } from "zod";

/** Row shape of public.foods. */
export const FoodRowSchema = z.object({
  id: z.string(),
  name_fa: z.string(),
  name_en: z.string(),
  source: z.enum(["fa_manual", "usda", "off", "figfit"]),
  kcal_100g: z.coerce.number(),
  protein_100g: z.coerce.number(),
  carbs_100g: z.coerce.number(),
  fat_100g: z.coerce.number(),
  cooked_factor: z.coerce.number(),
  state: z.enum(["raw", "cooked", "as_served"]),
  confidence: z.enum(["high", "medium", "low"]),
  tags: z.array(z.string()).nullable().optional(),
});
export type FoodRow = z.infer<typeof FoodRowSchema>;

export function foodFromRow(row: unknown): Food {
  const r = FoodRowSchema.parse(row);
  return FoodSchema.parse({
    id: r.id,
    name_fa: r.name_fa,
    name_en: r.name_en,
    source: r.source,
    per100g: { kcal: r.kcal_100g, protein_g: r.protein_100g, carbs_g: r.carbs_100g, fat_g: r.fat_100g },
    cooked_factor: r.cooked_factor,
    state: r.state,
    confidence: r.confidence,
    tags: r.tags ?? [],
  });
}

export const PortionRowSchema = z.object({
  food_id: z.string(),
  unit_fa: z.string(),
  unit_en: z.string(),
  grams_default: z.coerce.number(),
  grams_min: z.coerce.number(),
  grams_max: z.coerce.number(),
});

export function unitFromRow(row: unknown): PortionUnit {
  const r = PortionRowSchema.parse(row);
  return PortionUnitSchema.parse(r);
}
