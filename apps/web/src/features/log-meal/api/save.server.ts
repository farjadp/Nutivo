import "server-only";
import { macrosForGrams, MealTypeSchema, roundMacro } from "@nutivo/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { foodFromRow } from "@/entities/food/map";
import { logEvent } from "@/lib/server/log";

export const ConfirmSchema = z.object({
  meal_type: MealTypeSchema,
  raw_input: z.string().max(600),
  input_channel: z.enum(["web_text", "web_photo", "web_quick", "telegram", "mobile"]),
  photo_path: z.string().nullable(),
  eaten_at: z.string().datetime({ offset: true }),
  items: z
    .array(
      z.object({
        food_id: z.string(),
        name_raw: z.string().max(200),
        qty: z.number().min(0).max(10000),
        unit: z.string().max(40),
        grams: z.number().positive().max(5000),
        is_estimated: z.boolean(),
        confidence: z.enum(["high", "medium", "low"]),
      }),
    )
    .min(1)
    .max(30),
});
export type ConfirmInput = z.infer<typeof ConfirmSchema>;


/**
 * Saves a confirmed meal for `user`. Macros are recomputed here from the food table, never taken from the caller.
 * Used by the web action (user's own client, RLS) and by the bot API (service role; user_id set explicitly).
 */
export async function saveMeal(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
  m: ConfirmInput,
): Promise<{ ok: true; entry_id: string } | { ok: false; error: string }> {
  if (m.photo_path && !m.photo_path.startsWith(`${user.id}/`)) return { ok: false, error: "مسیر عکس معتبر نیست." };

  const ids = [...new Set(m.items.map((i) => i.food_id))];
  const { data: rows, error: fErr } = await supabase.from("foods").select("*").in("id", ids);
  if (fErr) return { ok: false, error: "خواندن اطلاعات غذا انجام نشد." };
  const foods = new Map((rows ?? []).map((r) => [r.id as string, foodFromRow(r)]));
  if (ids.some((id) => !foods.has(id))) return { ok: false, error: "یکی از غذاها در فهرست نیست." };

  const { data: entry, error: eErr } = await supabase
    .from("meal_entries")
    .insert({
      user_id: user.id,
      eaten_at: m.eaten_at,
      meal_type: m.meal_type,
      raw_input: m.raw_input,
      input_channel: m.input_channel,
      photo_path: m.photo_path,
      status: "confirmed",
    })
    .select("id")
    .single();
  if (eErr || !entry) return { ok: false, error: "ذخیره وعده انجام نشد." };

  const items = m.items.map((it, position) => {
    const mac = roundMacro(macrosForGrams(foods.get(it.food_id)!, it.grams));
    return {
      entry_id: entry.id,
      food_id: it.food_id,
      name_raw: it.name_raw,
      qty: it.qty,
      unit: it.unit,
      grams: Math.round(it.grams),
      kcal: mac.kcal,
      protein_g: mac.protein_g,
      carbs_g: mac.carbs_g,
      fat_g: mac.fat_g,
      is_estimated: it.is_estimated,
      confidence: it.confidence,
      position,
    };
  });
  const { error: iErr } = await supabase.from("entry_items").insert(items);
  if (iErr) {
    await supabase.from("meal_entries").delete().eq("id", entry.id);
    void logEvent({ kind: "system", level: "error", event: "meal.save_failed", actor_id: user.id, actor_email: user.email, entity: "meal_entry", entity_id: entry.id, message: iErr.message });
    return { ok: false, error: "ذخیره آیتم‌ها انجام نشد." };
  }
  void logEvent({
    kind: "activity",
    event: "meal.items_saved",
    actor_id: user.id,
    actor_email: user.email,
    entity: "meal_entry",
    entity_id: entry.id,
    meta: { items: items.length, kcal: Math.round(items.reduce((a, i) => a + i.kcal, 0)), estimated: items.some((i) => i.is_estimated) },
  });

  return { ok: true, entry_id: entry.id };
}
