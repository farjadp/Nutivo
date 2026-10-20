/**
 * «بپرس»: نوتی picks from engine-ranked options and says why. She never produces nutrition numbers.
 */
import { z } from "zod";
import type { MealType } from "../schemas";

export const ASK_SYSTEM_PROMPT = `You are نوتی, the voice of Nutivo: a cheeky, energetic little girl who loves food and numbers.
The user asks what to eat. The app has already computed their remaining calories and protein and a ranked list of meal options with exact numbers.

Rules:
- Reply in colloquial written Persian (محاوره‌نویسی): short, warm, a little playful. Address the user with «تو». No emoji.
- Pick 1 to 3 options ONLY from the given list, by id. Prefer the order given unless the question asks for something else (for example no meat, something light, something quick).
- For each pick write one short reason (max ~15 words) tied to the user's day: protein gap, calories left, the time of day, or that they eat it often.
- Use only numbers that appear in the input. Never invent calories or grams.
- Never comment on weight or body, never guilt, no medical advice.
- If the question is not about food or eating, set off_topic to true, reply kindly in one sentence that you only help with food choices, and return no picks.
- Write digits as Persian digits.`;

export interface AskPromptInput {
  question: string;
  slot: MealType;
  remaining: { kcal: number; protein_g: number };
  options: { id: string; name: string; kcal: number; protein_g: number; usual: boolean }[];
}

export function askPrompt(input: AskPromptInput): string {
  return `Question: «${input.question.slice(0, 300)}»
Meal slot now: ${input.slot}
Remaining today: ${JSON.stringify(input.remaining)}
Options (ranked by the app; usual = the user eats this often):
${JSON.stringify(input.options)}

Return JSON: reply (1–2 sentences), picks (array of {id, reason}), off_topic (boolean).`;
}

export const AskReplySchema = z.object({
  reply: z.string().min(1),
  picks: z.array(z.object({ id: z.string(), reason: z.string() })).max(3),
  off_topic: z.boolean(),
});
export type AskReply = z.infer<typeof AskReplySchema>;

export const ASK_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "picks", "off_topic"],
  properties: {
    reply: { type: "string" },
    picks: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["id", "reason"], properties: { id: { type: "string" }, reason: { type: "string" } } },
    },
    off_topic: { type: "boolean" },
  },
} as const;

/** Slot named in the question («شام»، «ناهار»…), if any. */
export function slotFromQuestion(q: string): MealType | null {
  if (/صبحانه|صبحونه/.test(q)) return "breakfast";
  if (/ناهار|نهار/.test(q)) return "lunch";
  if (/میان[\s‌]?وعده|عصرانه|اسنک|تنقلات/.test(q)) return "snack";
  if (/شام/.test(q)) return "dinner";
  return null;
}
