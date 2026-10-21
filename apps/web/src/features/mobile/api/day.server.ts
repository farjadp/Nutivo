import "server-only";
import { macrosForGrams, roundMacro, toGrams, UnitResolutionError, type AppDay, type AppItem, type BotResult, type MealType } from "@nutivo/core";
import { foodFromRow, unitFromRow } from "@/entities/food/map";
import { dayView, type Linked } from "@/features/bot/api/service.server";
import { loadDayFor } from "@/features/today/api/load-day.server";
import { DAY_WINDOW, statsComplete } from "@/features/today/model/day";
import { logEvent } from "@/lib/server/log";
import { adminClient } from "@/lib/supabase/admin";
import { addDays } from "@/shared/lib/format";

const db = () => adminClient();
const fail = <T>(error: string, code: NonNullable<Extract<BotResult<T>, { ok: false }>["code"]>): BotResult<T> => ({ ok: false, error, code });

/** The day summary plus item ids and the three-week strip. Null until the user has goals. */
export async function dayDetail(user: Linked, date?: string): Promise<AppDay | null> {
  const [day, raw] = await Promise.all([dayView(user, date), loadDayFor(db(), user.userId, date)]);
  if (!day || !raw) return null;
  const items = raw.items.map((i) => ({
    id: i.key,
    meal_type: i.meal_type,
    name: i.food.name_fa,
    said: i.name_raw,
    food_id: i.food.id,
    qty: i.qty,
    unit: i.unit,
    grams: Math.round(i.grams),
    kcal: Math.round(i.macros.kcal),
    protein_g: Math.round(i.macros.protein_g),
    estimated: i.is_estimated,
  }));
  const strip = Array.from({ length: DAY_WINDOW }, (_, n) => {
    const d = addDays(raw.today, n - (DAY_WINDOW - 1));
    const s = raw.stats[d];
    return { date: d, logged: Boolean(s?.meals), complete: statsComplete(s, raw.goals) };
  });
  return { day, items, strip };
}

/** The item with its entry owner, food and local units, or null when it is not this user's. */
async function ownedItem(userId: string, itemId: string) {
  const { data } = await db()
    .from("entry_items")
    .select("id, qty, unit, grams, is_estimated, food_id, foods(*), meal_entries!inner(user_id, input_channel, photo_path)")
    .eq("id", itemId)
    .eq("meal_entries.user_id", userId)
    .maybeSingle();
  if (!data?.foods) return null;
  const { data: unitRows } = await db().from("portion_units").select("*").eq("food_id", data.food_id);
  const entry = data.meal_entries as unknown as { input_channel: string; photo_path: string | null };
  return { row: data, food: foodFromRow(data.foods), units: (unitRows ?? []).map(unitFromRow), fromPhoto: entry.input_channel === "web_photo" || Boolean(entry.photo_path) };
}

/** One saved item for the edit sheet, by id, or null when it is not this user's. */
export async function itemById(user: Linked, itemId: string): Promise<AppItem | null> {
  const { data } = await db()
    .from("entry_items")
    .select("id, name_raw, qty, unit, grams, kcal, protein_g, is_estimated, food_id, foods(name_fa), meal_entries!inner(user_id, meal_type)")
    .eq("id", itemId)
    .eq("meal_entries.user_id", user.userId)
    .maybeSingle();
  if (!data) return null;
  const food = data.foods as unknown as { name_fa: string } | null;
  const entry = data.meal_entries as unknown as { meal_type: MealType };
  return {
    id: data.id as string,
    meal_type: entry.meal_type,
    name: food?.name_fa ?? String(data.name_raw),
    said: String(data.name_raw),
    food_id: String(data.food_id),
    qty: Number(data.qty),
    unit: String(data.unit),
    grams: Math.round(Number(data.grams)),
    kcal: Math.round(Number(data.kcal)),
    protein_g: Math.round(Number(data.protein_g)),
    estimated: Boolean(data.is_estimated),
  };
}

export type ItemChange = { qty: number; unit: string } | { grams: number };

/** Change amount or weight of a saved item. Grams come from the unit table; macros from the food row. */
export async function updateItem(user: Linked, itemId: string, change: ItemChange): Promise<BotResult<{ updated: true }>> {
  const found = await ownedItem(user.userId, itemId);
  if (!found) return fail("این آیتم پیدا نشد.", "not_found");
  let qty = Number(found.row.qty);
  let unit = String(found.row.unit);
  let grams: number;
  let estimated = Boolean(found.row.is_estimated);
  if ("grams" in change) {
    grams = change.grams;
    qty = change.grams;
    unit = "گرم";
    estimated = false;
  } else {
    try {
      const g = toGrams(change.qty, change.unit, found.food, found.units);
      grams = g.grams;
      estimated = found.fromPhoto || g.is_estimated;
    } catch (err) {
      if (err instanceof UnitResolutionError) return fail("وزن این واحد را نمی‌دانیم؛ وزن را به گرم بنویس.", "bad_request");
      throw err;
    }
    qty = change.qty;
    unit = change.unit;
  }
  if (!(grams > 0)) return fail("مقدار باید بیشتر از صفر باشد.", "bad_request");
  const m = roundMacro(macrosForGrams(found.food, grams));
  const { error } = await db()
    .from("entry_items")
    .update({ qty, unit, grams: Math.round(grams), kcal: m.kcal, protein_g: m.protein_g, carbs_g: m.carbs_g, fat_g: m.fat_g, is_estimated: estimated })
    .eq("id", itemId);
  if (error) return fail("ذخیره تغییر انجام نشد.", "server");
  void logEvent({ kind: "activity", event: "meal.item_edited", actor_id: user.userId, entity: "entry_item", entity_id: itemId, meta: { channel: "mobile", grams: Math.round(grams), kcal: m.kcal } });
  return { ok: true, data: { updated: true } };
}

/** Delete one item; the meal entry goes too when nothing is left in it. */
export async function deleteItem(user: Linked, itemId: string): Promise<BotResult<{ deleted: true }>> {
  const found = await ownedItem(user.userId, itemId);
  if (!found) return fail("این آیتم پیدا نشد.", "not_found");
  const { data: gone, error } = await db().from("entry_items").delete().eq("id", itemId).select("entry_id, name_raw");
  if (error || !gone?.length) return fail("حذف انجام نشد.", "server");
  const entryId = gone[0]!.entry_id as string;
  const { count } = await db().from("entry_items").select("id", { count: "exact", head: true }).eq("entry_id", entryId);
  if (!count) await db().from("meal_entries").delete().eq("id", entryId).eq("user_id", user.userId);
  void logEvent({ kind: "activity", event: "meal.item_deleted", actor_id: user.userId, entity: "entry_item", entity_id: itemId, message: String(gone[0]!.name_raw ?? ""), meta: { channel: "mobile" } });
  return { ok: true, data: { deleted: true } };
}

/** Local units for one food («کفگیر», «لیوان»…) for the edit sheet. */
export async function foodUnits(foodId: string): Promise<string[]> {
  const { data } = await db().from("portion_units").select("unit_fa").eq("food_id", foodId);
  return [...new Set((data ?? []).map((u) => String(u.unit_fa)))];
}
