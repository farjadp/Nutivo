import type { Food, PortionUnit, Resolution } from "./schemas";
import { normalizeFa, ZWNJ } from "./persian";

export interface GramsResult {
  grams: number;
  resolution: Resolution;
  is_estimated: boolean;
}

/** Thrown when a unit cannot be mapped to grams. Carries a Persian question to ask the user. */
export class UnitResolutionError extends Error {
  readonly code = "UNIT_UNRESOLVED" as const;
  constructor(
    readonly unit: string,
    readonly food: Food,
    /** Persian question suggestion for the user. */
    readonly question: string,
    /** Units that would have resolved for this food. */
    readonly known_units: string[],
  ) {
    super(`Cannot resolve unit "${unit}" for food "${food.id}"`);
    this.name = "UnitResolutionError";
  }
}

/**
 * Key used to compare units: normalised, lowercased, with ZWNJ and spaces removed
 * so «قاشق غذاخوری», «قاشق‌غذاخوری» and «قاشق غذا خوری» all match.
 */
export function unitKey(unit: string): string {
  return normalizeFa(unit)
    .toLowerCase()
    .replace(new RegExp(`[${ZWNJ}\\s\\u200b\\u200d_-]`, "g"), "")
    .replace(/\.$/, "");
}

const GRAM_KEYS = new Set(["گرم", "گ", "g", "gr", "gram", "grams", "گرام"]);
const KILOGRAM_KEYS = new Set(["کیلوگرم", "کیلو", "kg", "kilogram", "kilograms", "kilo"]);

interface Fallback {
  grams: number;
  keys: string[];
}

/** Generic gram estimates used only when the food itself has no matching portion unit. */
export const GENERIC_UNIT_FALLBACKS: Record<string, Fallback> = {
  tablespoon: { grams: 15, keys: ["قاشق غذاخوری", "قاشق غذا خوری", "قاشق سوپخوری", "ق غ", "tbsp", "tablespoon", "tablespoons"] },
  teaspoon: { grams: 5, keys: ["قاشق چای‌خوری", "قاشق چایخوری", "قاشق مرباخوری", "ق چ", "tsp", "teaspoon", "teaspoons"] },
  glass: { grams: 240, keys: ["لیوان", "glass", "cup", "cups", "پیمانه"] },
  // Household portions, used only when the food has no own unit (always marked estimated).
  bowl: { grams: 250, keys: ["کاسه", "bowl"] },
  plate: { grams: 300, keys: ["بشقاب", "plate"] },
  ladle: { grams: 120, keys: ["ملاقه", "ladle"] },
  smallBowl: { grams: 100, keys: ["پیاله", "small bowl"] },
  ricePaddle: { grams: 100, keys: ["کفگیر", "rice paddle"] },
  handful: { grams: 30, keys: ["مشت", "handful"] },
  teaGlass: { grams: 100, keys: ["استکان"] },
  milliliter: { grams: 1, keys: ["میلی‌لیتر", "سی‌سی", "ml", "cc", "milliliter", "millilitre"] },
  liter: { grams: 1000, keys: ["لیتر", "l", "liter", "litre"] },
};

const FALLBACK_BY_KEY: Map<string, number> = new Map(
  Object.values(GENERIC_UNIT_FALLBACKS).flatMap((f) => f.keys.map((k) => [unitKey(k), f.grams] as const)),
);

/** Parse a quantity that may be written with Persian/Arabic digits or a Persian decimal separator. */
export function parseQty(qty: number | string): number {
  if (typeof qty === "number") return qty;
  const n = Number(normalizeFa(qty).replace(/,/g, ""));
  if (!Number.isFinite(n)) throw new RangeError(`Invalid quantity: "${qty}"`);
  return n;
}

/**
 * Resolve `qty` of `unit` to grams for `food`.
 *
 * - گرم / g / gram → exact.
 * - A PortionUnit for this food (unit_fa or unit_en) → qty × grams_default, `default_unit`.
 * - Generic fallback (قاشق غذاخوری 15 g, قاشق چای‌خوری 5 g, لیوان 240 g, …) → `estimated_range`, is_estimated.
 * - Otherwise throws UnitResolutionError with a Persian question.
 */
export function toGrams(qty: number | string, unit: string, food: Food, units: PortionUnit[]): GramsResult {
  const q = parseQty(qty);
  if (q < 0) throw new RangeError(`Quantity must be ≥ 0, got ${q}`);
  const key = unitKey(unit);

  if (GRAM_KEYS.has(key)) return { grams: q, resolution: "exact", is_estimated: false };
  if (KILOGRAM_KEYS.has(key)) return { grams: q * 1000, resolution: "exact", is_estimated: false };

  const foodUnits = units.filter((u) => u.food_id === food.id);
  const match = foodUnits.find((u) => unitKey(u.unit_fa) === key || unitKey(u.unit_en) === key);
  if (match) return { grams: q * match.grams_default, resolution: "default_unit", is_estimated: false };

  const fallback = FALLBACK_BY_KEY.get(key);
  if (fallback !== undefined) return { grams: q * fallback, resolution: "estimated_range", is_estimated: true };

  const known = foodUnits.map((u) => u.unit_fa);
  const hint = known.length > 0 ? ` (مثلاً ${known.join("، ")})` : "";
  const question = `«${unit}» ${food.name_fa} تقریباً چند گرم است؟ می‌توانید مقدار را به گرم یا با یک واحد آشنا${hint} بگویید.`;
  throw new UnitResolutionError(unit, food, question, [...known, "گرم"]);
}
