"use server";
import { macrosForGrams, normalizeFa, roundMacro, type Food, type PortionUnit } from "@nutivo/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { foodFromRow, unitFromRow } from "@/entities/food/map";
import { logEvent } from "@/lib/server/log";
import { createClient } from "@/lib/supabase/server";
import { excludedFoodSources, isAuthDisabled, isSupabaseConfigured } from "@/shared/config";

export type EditResult = { ok: true } | { ok: false; error: string };

/** Foods for the edit sheet's search, with their local units. Works with or without a session (foods are public). */
export async function searchFoodsAction(q: string): Promise<{ foods: Food[]; units: Record<string, PortionUnit[]> }> {
  const term = normalizeFa(q).slice(0, 60);
  if (!isSupabaseConfigured() || term.length < 2) return { foods: [], units: {} };
  const supabase = await createClient();
  const { data: hits } = await supabase.rpc("search_foods", { q: term, lim: 8, exclude_sources: excludedFoodSources() });
  const ids = ((hits ?? []) as { id: string; score: number }[]).filter((h) => h.score >= 0.3).map((h) => h.id);
  if (!ids.length) return { foods: [], units: {} };
  return loadFoods(supabase, ids);
}

/** One food with its units (the edit sheet loads this when it opens). */
export async function foodUnitsAction(foodId: string): Promise<PortionUnit[]> {
  if (!isSupabaseConfigured() || !foodId) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("portion_units").select("*").eq("food_id", foodId);
  return (data ?? []).map(unitFromRow);
}

async function loadFoods(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]) {
  const [{ data: rows }, { data: unitRows }] = await Promise.all([
    supabase.from("foods").select("*").in("id", ids),
    supabase.from("portion_units").select("*").in("food_id", ids),
  ]);
  const byId = new Map((rows ?? []).map((r) => [r.id as string, foodFromRow(r)]));
  const units: Record<string, PortionUnit[]> = {};
  for (const r of unitRows ?? []) (units[r.food_id as string] ??= []).push(unitFromRow(r));
  return { foods: ids.map((id) => byId.get(id)).filter((f): f is Food => Boolean(f)), units };
}

const UpdateSchema = z.object({
  item_id: z.string().uuid(),
  food_id: z.string().min(1),
  qty: z.number().min(0).max(10000),
  unit: z.string().min(1).max(40),
  grams: z.number().positive().max(5000),
  is_estimated: z.boolean(),
});

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** Change food, quantity, unit or grams of a saved item. Macros are recomputed here from the database. */
export async function updateEntryItemAction(input: z.infer<typeof UpdateSchema>): Promise<EditResult> {
  if (!isSupabaseConfigured() || isAuthDisabled()) return { ok: false, error: "در این حالت ویرایش در مرورگر ذخیره می‌شود." };
  const p = UpdateSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "اطلاعات ویرایش کامل نیست." };
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "برای ویرایش باید وارد حساب شوی." };

  const { data: row, error: fErr } = await supabase.from("foods").select("*").eq("id", p.data.food_id).maybeSingle();
  if (fErr || !row) return { ok: false, error: "این غذا در فهرست نیست." };
  const m = roundMacro(macrosForGrams(foodFromRow(row), p.data.grams));

  // RLS limits this to items in the user's own entries; zero rows updated means not theirs or gone.
  const { data: updated, error } = await supabase
    .from("entry_items")
    .update({
      food_id: p.data.food_id,
      qty: p.data.qty,
      unit: p.data.unit,
      grams: Math.round(p.data.grams),
      kcal: m.kcal,
      protein_g: m.protein_g,
      carbs_g: m.carbs_g,
      fat_g: m.fat_g,
      is_estimated: p.data.is_estimated,
    })
    .eq("id", p.data.item_id)
    .select("id, entry_id");
  if (error || !updated?.length) return { ok: false, error: "ذخیره تغییر انجام نشد." };

  void logEvent({ kind: "activity", event: "meal.item_edited", actor_id: user.id, actor_email: user.email, entity: "entry_item", entity_id: p.data.item_id, meta: { food_id: p.data.food_id, grams: Math.round(p.data.grams), kcal: m.kcal } });
  revalidatePath("/today");
  return { ok: true };
}

/** Delete one item; the meal entry goes too when it has nothing left. */
export async function deleteEntryItemAction(itemId: string): Promise<EditResult> {
  if (!isSupabaseConfigured() || isAuthDisabled()) return { ok: false, error: "در این حالت حذف در مرورگر انجام می‌شود." };
  if (!z.string().uuid().safeParse(itemId).success) return { ok: false, error: "شناسه معتبر نیست." };
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "برای حذف باید وارد حساب شوی." };

  const { data: gone, error } = await supabase.from("entry_items").delete().eq("id", itemId).select("entry_id, name_raw");
  if (error || !gone?.length) return { ok: false, error: "حذف انجام نشد." };
  const entryId = gone[0]!.entry_id as string;
  const { count } = await supabase.from("entry_items").select("id", { count: "exact", head: true }).eq("entry_id", entryId);
  if (!count) await supabase.from("meal_entries").delete().eq("id", entryId);

  void logEvent({ kind: "activity", event: "meal.item_deleted", actor_id: user.id, actor_email: user.email, entity: "entry_item", entity_id: itemId, message: String(gone[0]!.name_raw ?? "") });
  revalidatePath("/today");
  return { ok: true };
}
