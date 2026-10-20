/**
 * Nightly report analysis. Claude writes short Persian prose from engine facts only.
 * This package makes no API calls; the host app passes these to the Claude client.
 */
import { z } from "zod";
import { toLatinDigits } from "../persian";
import type { ReportFacts } from "../report";

export const REPORT_SYSTEM_PROMPT = `You write the analysis part of a nightly nutrition report for Nutivo, a Persian nutrition companion.
The user wants gradual weight loss while keeping muscle, enough protein, and better food quality, without extreme restriction.

Rules:
- Write natural, written Persian: full verb forms, short sentences, no slang, no «می‌باشد».
- Address the user in the singular «تو» form, as the rest of the app does (for example «اضافه کن», «خورده‌ای»), never «شما».
- Refer to the day with the label given in the prompt (for example «دیروز»), not always «امروز».
- Use only numbers that appear in the facts JSON. Never estimate or invent calories, grams or percentages. You may round a number you were given.
- Never judge eating, the body or weight. No guilt, no «نباید», no «بد». Going over calories is information, not failure.
- Suggestions for tomorrow are concrete actions with familiar Iranian foods (for example «یک سیخ جوجه‌کباب به جای نیمی از برنج»). Do not attach nutrition numbers to suggested foods.
- If is_partial is true, say once that some amounts are estimates.
- If logged is false, say there is nothing to analyse yet and give one tip for logging tomorrow.
- Write digits as Persian digits.`;

export function reportPrompt(facts: ReportFacts, dayLabel = "امروز"): string {
  return `Day label: «${dayLabel}».\nFacts for ${facts.date} (computed by the app's nutrition engine):\n${JSON.stringify(facts)}\n\nReturn JSON with:
- analysis: 3 to 5 short sentences answering, in this order where relevant: was calories in the target range; was protein enough; were carbs and fat balanced; which meal had the most calories; which foods raised fat or calories.
- tomorrow: 2 or 3 concrete, practical suggestions for tomorrow.
- strength: one sentence, the day's most important strength.
- priority: one sentence, the single most useful thing to improve.`;
}

export const ReportAnalysisSchema = z.object({
  analysis: z.array(z.string().min(1)).min(1).max(6),
  tomorrow: z.array(z.string().min(1)).min(1).max(4),
  strength: z.string().min(1),
  priority: z.string().min(1),
});
export type ReportAnalysis = z.infer<typeof ReportAnalysisSchema>;

export const REPORT_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["analysis", "tomorrow", "strength", "priority"],
  properties: {
    analysis: { type: "array", items: { type: "string" } },
    tomorrow: { type: "array", items: { type: "string" } },
    strength: { type: "string" },
    priority: { type: "string" },
  },
} as const;

/** Every number the facts contain, rounded both ways, so the guard can recognise legitimate citations. */
export function allowedNumbers(facts: ReportFacts): Set<number> {
  const out = new Set<number>();
  const add = (n: number) => {
    out.add(Math.round(n));
    out.add(Math.round(n * 10) / 10);
    out.add(Math.abs(Math.round(n)));
  };
  const walk = (v: unknown) => {
    if (typeof v === "number") {
      add(v);
      if (v > 0 && v <= 2) add(v * 100); // ratios → percentages
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(facts);
  return out;
}

/**
 * Removes sentences that cite a number the engine did not produce (principle 1: numbers never come from the model).
 * Small counts (≤ 10, e.g. «دو تخم‌مرغ») are allowed.
 */
export function guardNumbers(lines: string[], allowed: Set<number>): { kept: string[]; dropped: string[] } {
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const line of lines) {
    const nums = (toLatinDigits(line).replace(/٬|,/g, "").replace(/٫/g, ".").match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
    const bad = nums.some((n) => n > 10 && !allowed.has(n) && !allowed.has(Math.round(n)));
    (bad ? dropped : kept).push(line);
  }
  return { kept, dropped };
}

/** «۱۰۵۹» → «۱٬۰۵۹»: Persian thousands separator on 4+ digit integers the model wrote without one. */
export function groupThousands(text: string): string {
  return text.replace(/(?<![\d۰-۹٫.])([0-9۰-۹]{4,})(?![\d۰-۹٫.])/g, (m) => {
    const latin = toLatinDigits(m);
    const grouped = latin.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
    return /[۰-۹]/.test(m) ? grouped.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!) : grouped;
  });
}
