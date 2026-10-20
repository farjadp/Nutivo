import "server-only";
import type { Goals, MealType } from "@nutivo/core";
import { redirect } from "next/navigation";
import type { LoggedItem } from "@/entities/day/sample";
import { foodFromRow } from "@/entities/food/map";
import { createClient } from "@/lib/supabase/server";

/** YYYY-MM-DD for an instant in an IANA timezone. */
export function localDate(at: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}

interface EntryRow {
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

export async function loadDay() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile, error: pErr } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  if (pErr) throw new Error(`profile query failed: ${pErr.message}`);
  if (!profile?.goal_kcal) redirect("/onboarding");

  const tz: string = profile.timezone ?? "America/Toronto";
  const now = new Date();
  const today = localDate(now, tz);
  const since = new Date(now.getTime() - 22 * 86400000).toISOString();

  const { data, error } = await supabase
    .from("meal_entries")
    .select("id, eaten_at, meal_type, input_channel, entry_items(id, name_raw, qty, unit, grams, kcal, protein_g, carbs_g, fat_g, is_estimated, confidence, position, foods(*))")
    .eq("status", "confirmed")
    .gte("eaten_at", since)
    .order("eaten_at", { ascending: true });
  if (error) throw new Error(`entries query failed: ${error.message}`);
  const entries = (data ?? []) as unknown as EntryRow[];

  const items: LoggedItem[] = [];
  const pastDates = new Set<string>();
  for (const e of entries) {
    const d = localDate(e.eaten_at, tz);
    if (d !== today) {
      pastDates.add(d);
      continue;
    }
    for (const it of [...e.entry_items].sort((a, b) => a.position - b.position)) {
      if (!it.foods) continue;
      items.push({
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
      });
    }
  }

  const goals: Goals = {
    kcal: Number(profile.goal_kcal),
    protein_g: Number(profile.goal_protein_g),
    carbs_g: Number(profile.goal_carbs_g),
    fat_g: Number(profile.goal_fat_g),
  };

  return { today, items, goals, pastLogDates: [...pastDates].sort() };
}
