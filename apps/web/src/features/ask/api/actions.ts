"use server";
import type Anthropic from "@anthropic-ai/sdk";
import {
  ASK_OUTPUT_SCHEMA,
  ASK_SYSTEM_PROMPT,
  askPrompt,
  AskReplySchema,
  groupThousands,
  guardNumbers,
  macrosForGrams,
  MEAL_IDEAS,
  mealSlot,
  rankIdeas,
  slotFromQuestion,
  sumMacros,
  type Food,
  type Goals,
  type IdeaCandidate,
  type Macro,
  type MealType,
} from "@nutivo/core";
import { z } from "zod";
import { foodFromRow } from "@/entities/food/map";
import { anthropic, reportModel } from "@/lib/ai/client";
import { logEvent } from "@/lib/server/log";
import { createClient } from "@/lib/supabase/server";
import { loadDay } from "@/features/today/api/load-day.server";
import { isAuthDisabled, isSupabaseConfigured } from "@/shared/config";
import { faInt } from "@/shared/lib/format";

export interface AskOption {
  id: string;
  name: string;
  source: "idea" | "history";
  reason: string;
  macros: Macro;
  items: { food: Food; qty: number; unit: string; grams: number }[];
}

export type AskResult =
  | { ok: true; reply: string; slot: MealType; remaining: { kcal: number; protein_g: number }; options: AskOption[] }
  | { ok: false; error: string };

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

type Usual = z.infer<typeof LocalContext>["usual"][number];

/** «برای شام چی بخورم؟» → three options with engine numbers and one-line reasons from نوتی. */
export async function askAction(input: z.infer<typeof AskInput>): Promise<AskResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "سرویس هنوز راه‌اندازی نشده." };
  const p = AskInput.safeParse(input);
  if (!p.success) return { ok: false, error: "سؤال را کوتاه‌تر بنویس." };
  const supabase = await createClient();

  // 1. The day so far: from the database (live) or from the browser (review mode).
  let goals: Goals;
  let eatenMacros: Macro;
  let usual: Usual[];
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
    usual = day.repeats.map((r) => ({
      id: r.id,
      name: [...new Set(r.items.map((i) => i.food.name_fa))].slice(0, 3).join(" و "),
      meal_type: r.meal_type,
      items: r.items.map((i) => ({ food_id: i.food.id, qty: i.qty, unit: i.unit, grams: i.grams })),
    }));
  }
  const remaining = { kcal: Math.round(goals.kcal - eatenMacros.kcal), protein_g: Math.round(goals.protein_g - eatenMacros.protein_g) };
  const slot = slotFromQuestion(p.data.question) ?? mealSlot(p.data.hour);

  // 2. Candidates with numbers from the food table, ranked by the engine.
  const allIds = [...new Set([...MEAL_IDEAS.flatMap((m) => m.items.map((i) => i.food_id)), ...usual.flatMap((u) => u.items.map((i) => i.food_id))])];
  const foods = await loadFoods(supabase, allIds);
  const pool = new Map<string, Omit<AskOption, "reason">>();
  const add = (id: string, name: string, source: AskOption["source"], refs: z.infer<typeof ItemRef>[]) => {
    const items = refs.flatMap((r) => (foods.get(r.food_id) ? [{ food: foods.get(r.food_id)!, qty: r.qty, unit: r.unit, grams: r.grams }] : []));
    if (items.length !== refs.length || !items.length) return;
    pool.set(id, { id, name, source, items, macros: sumMacros(items.map((i) => macrosForGrams(i.food, i.grams))) });
  };
  for (const m of MEAL_IDEAS) add(`i:${m.id}`, m.name_fa, "idea", m.items);
  for (const u of usual) add(`h:${u.id}`, u.name, "history", u.items);

  const slotsOf = (id: string): MealType[] =>
    id.startsWith("i:") ? MEAL_IDEAS.find((m) => `i:${m.id}` === id)?.slots ?? [] : [usual.find((u) => `h:${u.id}` === id)?.meal_type ?? slot];
  const candidates: IdeaCandidate[] = [...pool.values()].map((o) => ({ id: o.id, name_fa: o.name, source: o.source, slots: slotsOf(o.id), macros: o.macros }));
  const ranked = rankIdeas({ candidates, remaining, slot, limit: 8 });

  // 3. نوتی picks and explains; the engine's order is the fallback.
  const fallback = (): AskResult => ({
    ok: true,
    slot,
    remaining,
    reply:
      remaining.kcal > 0
        ? `هنوز ${faInt(remaining.kcal)} کالری و ${faInt(Math.max(0, remaining.protein_g))} گرم پروتئین برات مونده. اینا به نظرم خوبن:`
        : "امروز به هدف کالری رسیدی؛ اگه گرسنه‌ای، یه چیز سبک:",
    options: ranked.slice(0, 3).map((r) => ({ ...pool.get(r.id)!, reason: r.source === "history" ? "از همونایی که زیاد می‌خوری." : "" })),
  });

  const t0 = Date.now();
  try {
    const client = await anthropic();
    const model = await reportModel();
    const res = await client.messages.create({
      model,
      max_tokens: 1024,
      system: ASK_SYSTEM_PROMPT,
      output_config: { effort: "low", format: { type: "json_schema", schema: ASK_OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: askPrompt({
            question: p.data.question,
            slot,
            remaining,
            options: ranked.map((r) => ({ id: r.id, name: r.name_fa, kcal: Math.round(r.macros.kcal), protein_g: Math.round(r.macros.protein_g), usual: r.source === "history" })),
          }),
        },
      ],
    });
    const text = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
    const parsed = AskReplySchema.parse(JSON.parse(text ?? ""));
    void logEvent({ kind: "system", event: "ai.ask", actor_id: actorId, actor_email: actorId ? null : "review-mode", message: p.data.question.slice(0, 120), meta: { model, ms: Date.now() - t0, ...res.usage } });

    // Numbers the reply may cite: remaining budget and the listed options.
    const allowed = new Set<number>([remaining.kcal, remaining.protein_g, Math.abs(remaining.kcal), ...ranked.flatMap((r) => [Math.round(r.macros.kcal), Math.round(r.macros.protein_g)])]);
    const reply = guardNumbers([parsed.reply], allowed).kept[0];
    if (parsed.off_topic) return { ok: true, slot, remaining, reply: reply ?? "من فقط تو انتخاب غذا کمکت می‌کنم!", options: [] };
    const options = parsed.picks.flatMap((pk) => {
      const o = pool.get(pk.id);
      if (!o || !ranked.some((r) => r.id === pk.id)) return [];
      return [{ ...o, reason: groupThousands(guardNumbers([pk.reason], allowed).kept[0] ?? "") }];
    });
    if (!options.length || !reply) return fallback();
    return { ok: true, slot, remaining, reply: groupThousands(reply), options };
  } catch (err) {
    void logEvent({ kind: "system", level: "warn", event: "ai.ask_failed", actor_id: actorId, message: err instanceof Error ? err.message : String(err) });
    return fallback();
  }
}

async function loadFoods(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]): Promise<Map<string, Food>> {
  if (!ids.length) return new Map();
  const { data } = await supabase.from("foods").select("*").in("id", ids);
  return new Map((data ?? []).map((r) => [r.id as string, foodFromRow(r)]));
}
