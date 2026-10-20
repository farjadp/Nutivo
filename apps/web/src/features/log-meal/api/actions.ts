"use server";
import { macrosForGrams, MealTypeSchema, roundMacro } from "@nutivo/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { foodFromRow } from "@/entities/food/map";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured, isAuthDisabled, isSupabaseConfigured, PHOTO_MAX_BYTES, PHOTO_TYPES } from "@/shared/config";
import type { ActionResult, Draft } from "../model/draft";
import { ExtractError, extractMeal } from "./extract.server";
import { resolveMeal } from "./resolve.server";

const NOT_READY = "سرویس هنوز راه‌اندازی نشده (Supabase یا کلید Claude).";

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null } as const;
  return { supabase, user: data.user } as const;
}

/** Text or photo → draft items for the confirm screen. Nothing is saved except the photo. */
export async function draftMealAction(form: FormData): Promise<ActionResult<Draft>> {
  if (!isSupabaseConfigured()) return { ok: false, error: NOT_READY };
  if (!isAiConfigured()) return { ok: false, error: "کلید Claude تنظیم نشده (ANTHROPIC_API_KEY در apps/web/.env.local)." };
  const local = isAuthDisabled();
  const { supabase, user } = await requireUser();
  if (!user && !local) return { ok: false, error: "برای ثبت باید وارد حساب شوی." };

  const text = String(form.get("text") ?? "").slice(0, 600);
  const nowISO = String(form.get("now") ?? new Date().toISOString());
  const photo = form.get("photo");

  let image: { base64: string; mediaType: (typeof PHOTO_TYPES)[number] } | undefined;
  let photo_path: string | null = null;
  let photo_preview_url: string | null = null;

  try {
    if (photo instanceof File && photo.size > 0) {
      if (photo.size > PHOTO_MAX_BYTES) return { ok: false, error: "عکس بزرگ‌تر از ۸ مگابایت است." };
      if (!(PHOTO_TYPES as readonly string[]).includes(photo.type)) return { ok: false, error: "فقط عکس JPG، PNG یا WebP." };
      const bytes = Buffer.from(await photo.arrayBuffer());
      image = { base64: bytes.toString("base64"), mediaType: photo.type as (typeof PHOTO_TYPES)[number] };
    }
    if (image && user) {
      const photoFile = photo as File;
      const bytes = Buffer.from(image.base64, "base64");
      const ext = photoFile.type.split("/")[1];
      photo_path = `${user.id}/${nowISO.slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("meal-photos").upload(photo_path, bytes, { contentType: photoFile.type, upsert: false });
      if (up.error) return { ok: false, error: "آپلود عکس انجام نشد. دوباره امتحان کن." };
      const signed = await supabase.storage.from("meal-photos").createSignedUrl(photo_path, 60 * 30);
      photo_preview_url = signed.data?.signedUrl ?? null;
    }

    const parsed = await extractMeal({ text, image, nowISO });
    const resolved = await resolveMeal(supabase, parsed);
    const question = resolved.items.find((i) => i.question)?.question;

    return {
      ok: true,
      data: {
        meal_type: parsed.meal_type,
        raw_input: text,
        input_channel: image ? "web_photo" : "web_text",
        photo_path,
        photo_preview_url,
        eaten_at: parsed.eaten_at ?? nowISO,
        items: resolved.items,
        foods: resolved.foods,
        units: resolved.units,
        question,
      },
    };
  } catch (err) {
    if (err instanceof ExtractError) return { ok: false, error: err.userMessage };
    console.error("draftMealAction", err);
    return { ok: false, error: "یک مشکلی پیش آمد. دوباره تلاش کن." };
  }
}

const ConfirmSchema = z.object({
  meal_type: MealTypeSchema,
  raw_input: z.string().max(600),
  input_channel: z.enum(["web_text", "web_photo"]),
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

/** Saves a confirmed meal. Macros are recomputed here from the database, never taken from the client. */
export async function confirmMealAction(input: ConfirmInput): Promise<ActionResult<{ entry_id: string }>> {
  if (!isSupabaseConfigured()) return { ok: false, error: NOT_READY };
  const parsed = ConfirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "اطلاعات وعده کامل نیست." };
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "برای ثبت باید وارد حساب شوی." };
  const m = parsed.data;

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
    return { ok: false, error: "ذخیره آیتم‌ها انجام نشد." };
  }

  revalidatePath("/today");
  return { ok: true, data: { entry_id: entry.id } };
}

/** Removes an uploaded photo when the user cancels the draft. */
export async function discardDraftPhotoAction(photo_path: string | null): Promise<void> {
  if (!photo_path || !isSupabaseConfigured()) return;
  const { supabase, user } = await requireUser();
  if (!user || !photo_path.startsWith(`${user.id}/`)) return;
  await supabase.storage.from("meal-photos").remove([photo_path]);
}
