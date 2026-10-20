import "server-only";
import { suggestRepeats, type Goals, type MealType } from "@nutivo/core";
import { redirect } from "next/navigation";
import type { LoggedItem } from "@/entities/day/sample";
import { foodFromRow } from "@/entities/food/map";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/shared/lib/format";
import { DAY_WINDOW, type DayStats } from "../model/day";

/** YYYY-MM-DD for an instant in an IANA timezone. */
export function localDate(at: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}

export interface EntryRow {
  id: string;
  eaten_at: string;
  meal_type: MealType;
  input_channel: string;
  entry_items: {
    id: string;
    name_raw: string;
    qty: number;
    unit: string;
    grams: number;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    is_estimated: boolean;
    confidence: "high" | "medium" | "low" | null;
    position: number;
    foods: unknown;
  }[];
}

/** Loads one day (default today) plus per-day totals for the day strip. `requested` is clamped to the strip window. */
export const ENTRY_SELECT =
  "id, eaten_at, meal_type, input_channel, entry_items(id, name_raw, qty, unit, grams, kcal, protein_g, carbs_g, fat_g, is_estimated, confidence, position, foods(*))";

/** Saved items of one entry, in their original order, with the macros frozen at save time. */
export function entryItems(e: EntryRow): LoggedItem[] {
  return [...e.entry_items]
    .sort((a, b) => a.position - b.position)
    .filter((it) => it.foods)
    .map((it) => ({
      key: it.id,
      meal_type: e.meal_type,
      name_raw: it.name_raw,
      qty: Number(it.qty),
      unit: it.unit,
      prep_hint: undefined,
      confidence: it.confidence ?? "medium",
      needs_question: undefined,
      from_photo: e.input_channel === "web_photo",
      food: foodFromRow(it.foods),
      grams: Number(it.grams),
      macros: { kcal: Number(it.kcal), protein_g: Number(it.protein_g), carbs_g: Number(it.carbs_g), fat_g: Number(it.fat_g) },
      is_estimated: it.is_estimated,
      resolution: it.is_estimated ? "estimated_range" : "default_unit",
    }));
}

/** Signed-in web user: their day, or a redirect to login / onboarding. */
export async function loadDay(requested?: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const day = await loadDayFor(supabase, auth.user.id, requested);
  if (!day) redirect("/onboarding");
  return day;
}

/**
 * One user's day (default today in their timezone) with per-day totals and repeat suggestions.
 * Works with the user's own client (RLS) or the service role (bot); every query is scoped to `userId`.
 * Returns null when the user has no goals yet.
 */
export async function loadDayFor(supabase: SupabaseClient, userId: string, requested?: string) {
  const { data: profile, error: pErr } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (pErr) throw new Error(`profile query failed: ${pErr.message}`);
  if (!profile?.goal_kcal) return null;

  const tz: string = profile.timezone ?? "America/Toronto";
  const now = new Date();
  const today = localDate(now, tz);
  const oldest = addDays(today, -(DAY_WINDOW - 1));
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= today && requested >= oldest ? requested : today;
  // One extra day on the start so timezone edges are covered; filtered by local date below.
  const since = new Date(new Date(`${oldest}T00:00:00Z`).getTime() - 86400000).toISOString();

  const { data, error } = await supabase
    .from("meal_entries")
    .select(ENTRY_SELECT)
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .gte("eaten_at", since)
    .order("eaten_at", { ascending: true });
  if (error) throw new Error(`entries query failed: ${error.message}`);
  const entries = (data ?? []) as unknown as EntryRow[];

  const items: LoggedItem[] = [];
  const pastDates = new Set<string>();
  const stats: Record<string, DayStats> = {};
  const mealsByDay: Record<string, Set<MealType>> = {};
  const history: Record<string, LoggedItem[]> = {};
  for (const e of entries) {
    const d = localDate(e.eaten_at, tz);
    if (d < oldest) continue;
    if (d !== today) pastDates.add(d);
    const s = (stats[d] ??= { kcal: 0, protein_g: 0, meals: 0 });
    for (const it of e.entry_items) {
      s.kcal += Number(it.kcal);
      s.protein_g += Number(it.protein_g);
    }
    (mealsByDay[d] ??= new Set()).add(e.meal_type);
    s.meals = mealsByDay[d]!.size;
    (history[d] ??= []).push(...entryItems(e));
    if (d !== date) continue;
    items.push(...entryItems(e));
  }

  const goals: Goals = {
    kcal: Number(profile.goal_kcal),
    protein_g: Number(profile.goal_protein_g),
    carbs_g: Number(profile.goal_carbs_g),
    fat_g: Number(profile.goal_fat_g),
  };

  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(now));
  const repeats = suggestRepeats({ history, today, hour });

  return { repeats, userId, timezone: tz, today, date, items, goals, pastLogDates: [...pastDates].sort(), stats };
}
