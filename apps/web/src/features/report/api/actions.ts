"use server";
import { macrosForGrams, type Goals, type ReportAnalysis } from "@nutivo/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { LoggedItem } from "@/entities/day/sample";
import { foodFromRow } from "@/entities/food/map";
import { logEvent } from "@/lib/server/log";
import { createClient } from "@/lib/supabase/server";
import { localDate } from "@/features/today/api/load-day.server";
import { isAuthDisabled, isSupabaseConfigured } from "@/shared/config";
import { faDayWord } from "@/shared/lib/format";
import { itemsHash } from "../model/hash";
import { itemsForDate, ReportError, storeReport, writeAnalysis, type AnalysisResult } from "./report.server";

export type ReportResult = { ok: true; analysis: ReportAnalysis; hash: string } | { ok: false; error: string };

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const LocalSchema = z.object({
  date: DateSchema,
  today: DateSchema,
  goals: z.object({ kcal: z.number().positive(), protein_g: z.number().nonnegative(), carbs_g: z.number().nonnegative(), fat_g: z.number().nonnegative() }),
  items: z
    .array(
      z.object({
        key: z.string().max(80),
        food_id: z.string().min(1),
        grams: z.number().positive().max(5000),
        qty: z.number().nonnegative(),
        unit: z.string().max(40),
        name_raw: z.string().max(120),
        meal_type: z.enum(["breakfast", "lunch", "snack", "dinner"]),
        is_estimated: z.boolean(),
        confidence: z.enum(["high", "medium", "low"]),
        from_photo: z.boolean(),
      }),
    )
    .max(80),
});

function logResult(r: AnalysisResult, actor: { id: string | null; email: string | null }, date: string) {
  void logEvent({
    kind: "system",
    event: "ai.report",
    actor_id: actor.id,
    actor_email: actor.email,
    message: `report ${date}`,
    meta: { model: r.model, ms: r.ms, ...r.usage, dropped: r.dropped.length },
  });
  if (r.dropped.length) void logEvent({ kind: "system", level: "warn", event: "ai.report_number_guard", actor_id: actor.id, message: r.dropped.join(" | ").slice(0, 500) });
}

function failure(err: unknown, actorId: string | null): ReportResult {
  void logEvent({ kind: "system", level: err instanceof ReportError ? "warn" : "error", event: "ai.report_failed", actor_id: actorId, message: err instanceof Error ? err.message : String(err) });
  return { ok: false, error: err instanceof ReportError ? err.userMessage : "ساختن تحلیل انجام نشد. دوباره امتحان کن." };
}

/** Signed-in user: analysis for one of their days, saved to daily_reports. */
export async function generateReportAction(date: string): Promise<ReportResult> {
  if (!isSupabaseConfigured() || isAuthDisabled()) return { ok: false, error: "در این حالت گزارش در مرورگر ساخته می‌شود." };
  if (!DateSchema.safeParse(date).success) return { ok: false, error: "تاریخ معتبر نیست." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, error: "برای گزارش باید وارد حساب شوی." };
  try {
    const { data: profile } = await supabase.from("profiles").select("timezone, goal_kcal, goal_protein_g, goal_carbs_g, goal_fat_g").eq("id", user.id).maybeSingle();
    if (!profile?.goal_kcal) return { ok: false, error: "اول هدف‌هایت را تعیین کن." };
    const goals: Goals = { kcal: Number(profile.goal_kcal), protein_g: Number(profile.goal_protein_g), carbs_g: Number(profile.goal_carbs_g), fat_g: Number(profile.goal_fat_g) };
    const tz = profile.timezone ?? "America/Toronto";
    const items = await itemsForDate(supabase, user.id, tz, date);
    const r = await writeAnalysis(items, goals, date, faDayWord(date, localDate(new Date(), tz)));
    await storeReport(supabase, user.id, date, items, goals, r);
    logResult(r, { id: user.id, email: user.email ?? null }, date);
    revalidatePath("/report");
    return { ok: true, analysis: r.analysis, hash: itemsHash(items) };
  } catch (err) {
    return failure(err, user.id);
  }
}

/** Review mode (no login): items come from the browser; macros are recomputed here from the food table. */
export async function generateLocalReportAction(input: z.infer<typeof LocalSchema>): Promise<ReportResult> {
  if (!isSupabaseConfigured() || !isAuthDisabled()) return { ok: false, error: "این حالت فقط برای بررسی بدون ورود است." };
  const p = LocalSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "اطلاعات روز کامل نیست." };
  try {
    const supabase = await createClient();
    const ids = [...new Set(p.data.items.map((i) => i.food_id))];
    const { data: rows, error } = ids.length ? await supabase.from("foods").select("*").in("id", ids) : { data: [], error: null };
    if (error) throw new Error(error.message);
    const foods = new Map((rows ?? []).map((r) => [r.id as string, foodFromRow(r)]));
    const items: LoggedItem[] = p.data.items.flatMap((i) => {
      const food = foods.get(i.food_id);
      if (!food) return [];
      return [{ ...i, food, prep_hint: undefined, needs_question: undefined, macros: macrosForGrams(food, i.grams), resolution: i.is_estimated ? "estimated_range" : "default_unit" } satisfies LoggedItem];
    });
    const r = await writeAnalysis(items, p.data.goals, p.data.date, faDayWord(p.data.date, p.data.today));
    logResult(r, { id: null, email: "review-mode" }, p.data.date);
    return { ok: true, analysis: r.analysis, hash: itemsHash(items) };
  } catch (err) {
    return failure(err, null);
  }
}
