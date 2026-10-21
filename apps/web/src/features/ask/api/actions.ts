"use server";
import { macrosForGrams, sumMacros, type Goals, type Macro } from "@nutivo/core";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadDay } from "@/features/today/api/load-day.server";
import { isAuthDisabled, isSupabaseConfigured } from "@/shared/config";
import { askWith, loadFoods, usualFromRepeats, type AskResult, type UsualMeal } from "./ask.server";

export type { AskOption, AskResult } from "./ask.server";

const ItemRef = z.object({ food_id: z.string().min(1), qty: z.number().nonnegative(), unit: z.string().max(40), grams: z.number().positive().max(5000) });

const LocalContext = z.object({
  goals: z.object({ kcal: z.number().positive(), protein_g: z.number().nonnegative(), carbs_g: z.number().nonnegative(), fat_g: z.number().nonnegative() }),
  eaten: z.array(z.object({ food_id: z.string(), grams: z.number().positive().max(5000) })).max(80),
  usual: z.array(z.object({ id: z.string().max(200), name: z.string().max(120), meal_type: z.enum(["breakfast", "lunch", "snack", "dinner"]), items: z.array(ItemRef).max(12) })).max(8),
});

const AskInput = z.object({
  question: z.string().trim().min(1).max(300),
  hour: z.number().int().min(0).max(23),
  local: LocalContext.optional(),
});

/** «برای شام چی بخورم؟» → three options with engine numbers and one-line reasons from نوتی. */
export async function askAction(input: z.infer<typeof AskInput>): Promise<AskResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "سرویس هنوز راه‌اندازی نشده." };
  const p = AskInput.safeParse(input);
  if (!p.success) return { ok: false, error: "سؤال را کوتاه‌تر بنویس." };
  const supabase = await createClient();

  // 1. The day so far: from the database (live) or from the browser (review mode).
  let goals: Goals;
  let eatenMacros: Macro;
  let usual: UsualMeal[];
  let actorId: string | null = null;
  if (isAuthDisabled()) {
    if (!p.data.local) return { ok: false, error: "اطلاعات امروز نرسید." };
    goals = p.data.local.goals;
    const ids = [...new Set(p.data.local.eaten.map((e) => e.food_id))];
    const foods = await loadFoods(supabase, ids);
    eatenMacros = sumMacros(p.data.local.eaten.flatMap((e) => (foods.get(e.food_id) ? [macrosForGrams(foods.get(e.food_id)!, e.grams)] : [])));
    usual = p.data.local.usual;
  } else {
    const day = await loadDay();
    actorId = day.userId;
    goals = day.goals;
    eatenMacros = sumMacros(day.items.map((i) => i.macros));
    usual = usualFromRepeats(day.repeats);
  }
  return askWith(supabase, { question: p.data.question, hour: p.data.hour, goals, eatenMacros, usual, actorId });
}
