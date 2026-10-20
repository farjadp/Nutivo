import { z } from "zod";

const nonNeg = z.number().min(0);

export const MacroSchema = z.object({
  kcal: nonNeg,
  protein_g: nonNeg,
  carbs_g: nonNeg,
  fat_g: nonNeg,
});
export type Macro = z.infer<typeof MacroSchema>;

export const FoodSourceSchema = z.enum(["fa_manual", "usda", "off", "figfit"]);
export type FoodSource = z.infer<typeof FoodSourceSchema>;

export const FoodStateSchema = z.enum(["raw", "cooked", "as_served"]);
export type FoodState = z.infer<typeof FoodStateSchema>;

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const FoodSchema = z.object({
  id: z.string(),
  name_fa: z.string(),
  name_en: z.string(),
  source: FoodSourceSchema,
  per100g: MacroSchema,
  /** Grams of cooked food produced per gram of raw food (rice ≈ 2.5–3). 1 = no change. */
  cooked_factor: z.number().positive().default(1),
  /** State that `per100g` describes. */
  state: FoodStateSchema,
  confidence: ConfidenceSchema,
  tags: z.array(z.string()).default([]),
});
export type Food = z.infer<typeof FoodSchema>;
export type FoodInput = z.input<typeof FoodSchema>;

export const PortionUnitSchema = z.object({
  food_id: z.string(),
  /** e.g. کفگیر، کاسه، سیخ، تکه، قاشق غذاخوری، لیوان، عدد */
  unit_fa: z.string(),
  unit_en: z.string(),
  grams_default: z.number().positive(),
  grams_min: z.number().min(0),
  grams_max: z.number().positive(),
});
export type PortionUnit = z.infer<typeof PortionUnitSchema>;

export const PrepHintSchema = z.enum(["fried", "grilled", "boiled", "raw", "unknown"]);
export type PrepHint = z.infer<typeof PrepHintSchema>;

/** One food item exactly as the LLM extracted it from user input. No nutrition numbers here. */
export const ParsedItemSchema = z.object({
  /** The food as the user said it, verbatim. */
  name_raw: z.string().min(1),
  qty: z.number().min(0),
  unit: z.string().min(1),
  prep_hint: PrepHintSchema.optional(),
  confidence: ConfidenceSchema,
  /** A single Persian question to ask the user when something is ambiguous. */
  needs_question: z.string().optional(),
  from_photo: z.boolean().default(false),
});
export type ParsedItem = z.infer<typeof ParsedItemSchema>;
export type ParsedItemInput = z.input<typeof ParsedItemSchema>;

export const MealTypeSchema = z.enum(["breakfast", "lunch", "snack", "dinner"]);
export type MealType = z.infer<typeof MealTypeSchema>;

export const ParsedMealSchema = z.object({
  meal_type: MealTypeSchema,
  items: z.array(ParsedItemSchema),
  eaten_at: z.string().datetime({ offset: true }).optional(),
});
export type ParsedMeal = z.infer<typeof ParsedMealSchema>;
export type ParsedMealInput = z.input<typeof ParsedMealSchema>;

export const ResolutionSchema = z.enum(["exact", "default_unit", "estimated_range"]);
export type Resolution = z.infer<typeof ResolutionSchema>;

export const ResolvedItemSchema = ParsedItemSchema.extend({
  food: FoodSchema,
  grams: z.number().min(0),
  macros: MacroSchema,
  is_estimated: z.boolean(),
  resolution: ResolutionSchema,
});
export type ResolvedItem = z.infer<typeof ResolvedItemSchema>;

export const GoalsSchema = z.object({
  kcal: nonNeg,
  protein_g: nonNeg,
  carbs_g: nonNeg,
  fat_g: nonNeg,
});
export type Goals = z.infer<typeof GoalsSchema>;

export const DayTotalsSchema = z.object({
  macros: MacroSchema,
  /** goal − consumed; negative when over goal. */
  remaining: z.object({
    kcal: z.number(),
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
  }),
  /** consumed / goal; 0..1 within goal, >1 when over. */
  pct: z.object({
    kcal: nonNeg,
    protein: nonNeg,
    carbs: nonNeg,
    fat: nonNeg,
  }),
});
export type DayTotals = z.infer<typeof DayTotalsSchema>;
