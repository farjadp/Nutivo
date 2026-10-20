import type { Confidence, Food, MealType, PortionUnit, PrepHint } from "@nutivo/core";

/** One line on the confirm screen. Numbers are computed from `food` + `grams`, never from the model. */
export interface DraftItem {
  key: string;
  name_raw: string;
  qty: number;
  unit: string;
  prep_hint?: PrepHint;
  confidence: Confidence;
  from_photo: boolean;
  /** Matched food; null when nothing in the database matched well enough. */
  food_id: string | null;
  /** Foods the user can switch to (best match first). */
  candidate_ids: string[];
  /** Grams resolved from qty+unit; null when the unit could not be resolved. */
  grams: number | null;
  is_estimated: boolean;
  question?: string;
}

export interface Draft {
  meal_type: MealType;
  raw_input: string;
  input_channel: "web_text" | "web_photo";
  photo_path: string | null;
  photo_preview_url: string | null;
  eaten_at: string;
  items: DraftItem[];
  /** All candidate foods with their units, keyed by id, so the client can recompute live. */
  foods: Record<string, Food>;
  units: Record<string, PortionUnit[]>;
  /** One question for the whole meal (from the model), if any. */
  question?: string;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
