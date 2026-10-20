import "server-only";
import type { Goals, MealType } from "@nutivo/core";
import { redirect } from "next/navigation";
import type { LoggedItem } from "@/entities/day/sample";
import { foodFromRow } from "@/entities/food/map";
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

export async function loadDay(requested?: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile, error: pErr } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  if (pErr) throw new Error(`profile query failed: ${pErr.message}`);
  if (!profile?.goal_kcal) redirect("/onboarding");

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
    .eq("status", "confirmed")
    .gte("eaten_at", since)
    .order("eaten_at", { ascending: true });
  if (error) throw new Error(`entries query failed: ${error.message}`);
  const entries = (data ?? []) as unknown as EntryRow[];

  const items: LoggedItem[] = [];
  const pastDates = new Set<string>();
  const stats: Record<string, DayStats> = {};
  const mealsByDay: Record<string, Set<MealType>> = {};
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
    if (d !== date) continue;
    items.push(...entryItems(e));
  }

  const goals: Goals = {
    kcal: Number(profile.goal_kcal),
    protein_g: Number(profile.goal_protein_g),
    carbs_g: Number(profile.goal_carbs_g),
    fat_g: Number(profile.goal_fat_g),
  };

  return { userId: auth.user.id, timezone: tz, today, date, items, goals, pastLogDates: [...pastDates].sort(), stats };
}
