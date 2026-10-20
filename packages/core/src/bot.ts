/** Contract between the web app's bot API (apps/web/src/app/api/bot) and the Telegram bot (apps/bot). */
import type { Goals, MealType } from "./schemas";

/** Shapes the bot API returns. Kept renderer-neutral so a mobile app can use them too. */
export interface TgUser {
  id: number;
  first_name?: string;
  username?: string;
  language_code?: string;
}

export interface DraftItemView {
  idx: number;
  said: string;
  food: string | null;
  qty: number;
  unit: string;
  grams: number | null;
  kcal: number | null;
  protein_g: number | null;
  estimated: boolean;
  question: string | null;
}

export interface DraftView {
  id: string;
  meal_type: MealType;
  items: DraftItemView[];
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  estimated: boolean;
  /** Every item has a food and grams, so it can be saved. */
  ready: boolean;
  question: string | null;
  from_photo: boolean;
}

export interface DayView {
  date: string;
  today: string;
  goals: Goals;
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  remaining: { kcal: number; protein_g: number };
  meals: { meal_type: MealType; kcal: number; items: { name: string; kcal: number; estimated: boolean }[] }[];
  streak: number;
  complete: boolean;
  repeats: { id: string; label: string; meal_type: MealType }[];
}

export type BotResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: "not_linked" | "no_goals" | "bad_request" | "not_found" | "server" };
