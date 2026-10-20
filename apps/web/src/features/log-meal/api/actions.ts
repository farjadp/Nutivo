"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { anthropicKey } from "@/lib/ai/client";
import { logEvent } from "@/lib/server/log";
import { isAuthDisabled, isSupabaseConfigured, PHOTO_MAX_BYTES, PHOTO_TYPES } from "@/shared/config";
import type { ActionResult, Draft } from "../model/draft";
import { ExtractError, extractMeal } from "./extract.server";
import { resolveMeal } from "./resolve.server";
import { ConfirmSchema, saveMeal, type ConfirmInput } from "./save.server";
export type { ConfirmInput } from "./save.server";

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
  if (!(await anthropicKey())) return { ok: false, error: "کلید Claude تنظیم نشده. از پنل ادمین (تنظیمات) یا ANTHROPIC_API_KEY واردش کن." };
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

    const ex = await extractMeal({ text, image, nowISO });
    const parsed = ex.meal;
    const resolved = await resolveMeal(supabase, parsed);
    const question = resolved.items.find((i) => i.question)?.question;
    void logEvent({
      kind: "system",
      event: "ai.extract",
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? (local ? "review-mode" : null),
      message: `${image ? "photo" : "text"} → ${parsed.items.length} items`,
      meta: {
        model: ex.model,
        ms: ex.ms,
        input_tokens: ex.usage.input_tokens,
        output_tokens: ex.usage.output_tokens,
        input: image ? "photo" : "text",
        items: parsed.items.length,
        unmatched: resolved.items.filter((i) => !i.food_id).length,
        questions: resolved.items.filter((i) => i.question).length,
      },
    });

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
    void logEvent({
      kind: "system",
      level: err instanceof ExtractError ? "warn" : "error",
      event: "ai.extract_failed",
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? (local ? "review-mode" : null),
      message: err instanceof Error ? err.message : String(err),
      meta: { input: photo instanceof File && photo.size > 0 ? "photo" : "text", cause: err instanceof Error && err.cause ? String(err.cause) : undefined },
    });
    if (err instanceof ExtractError) return { ok: false, error: err.userMessage };
    return { ok: false, error: "یک مشکلی پیش آمد. دوباره تلاش کن." };
  }
}

/** Saves a confirmed meal. Macros are recomputed here from the database, never taken from the client. */
export async function confirmMealAction(input: ConfirmInput): Promise<ActionResult<{ entry_id: string }>> {
  if (!isSupabaseConfigured()) return { ok: false, error: NOT_READY };
  const parsed = ConfirmSchema.safeParse(input);
  if (!parsed.success || parsed.data.input_channel === "telegram") return { ok: false, error: "اطلاعات وعده کامل نیست." };
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "برای ثبت باید وارد حساب شوی." };
  const res = await saveMeal(supabase, user, parsed.data);
  if (!res.ok) return res;
  revalidatePath("/today");
  return { ok: true, data: { entry_id: res.entry_id } };
}

/** Removes an uploaded photo when the user cancels the draft. */
export async function discardDraftPhotoAction(photo_path: string | null): Promise<void> {
  if (!photo_path || !isSupabaseConfigured()) return;
  const { supabase, user } = await requireUser();
  if (!user || !photo_path.startsWith(`${user.id}/`)) return;
  await supabase.storage.from("meal-photos").remove([photo_path]);
}
