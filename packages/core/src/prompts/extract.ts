/**
 * Claude tool definition and prompts for meal extraction.
 * This package makes no API calls; the host app passes these to the Claude client.
 */

export const EXTRACT_TOOL_NAME = "extract_meal" as const;

/** Plain JSON schema mirroring `ParsedMealSchema`, usable as a Claude `tools[].input_schema`. */
export const extractMealTool = {
  name: EXTRACT_TOOL_NAME,
  description:
    "Extract the foods a user ate from a Persian or English message or a food photo. " +
    "Return each item with the user's own words, a quantity and a unit. Never include nutrition numbers.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["meal_type", "items"],
    properties: {
      meal_type: {
        type: "string",
        enum: ["breakfast", "lunch", "snack", "dinner"],
        description: "Infer from the user's words, else from the time of day.",
      },
      eaten_at: {
        type: "string",
        format: "date-time",
        description: "ISO 8601 with offset. Only when the user states a time; otherwise omit.",
      },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name_raw", "qty", "unit", "confidence"],
          properties: {
            name_raw: {
              type: "string",
              description: "The food exactly as the user wrote or as visible in the photo. Do not translate or normalise.",
            },
            qty: { type: "number", minimum: 0, description: "Numeric quantity. Convert words like «دو تا» to 2." },
            unit: {
              type: "string",
              description:
                "Unit as the user said it (گرم، کفگیر، کاسه، سیخ، تکه، قاشق غذاخوری، لیوان، عدد…). Use «عدد» for countable items.",
            },
            prep_hint: {
              type: "string",
              enum: ["fried", "grilled", "boiled", "raw", "unknown"],
              description: "Only when stated or clearly visible.",
            },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            needs_question: {
              type: "string",
              description:
                "One short Persian question to ask the user when quantity, unit or raw/cooked is ambiguous. At most one item in the meal may carry a question.",
            },
            from_photo: { type: "boolean", description: "true when the item came from an image." },
          },
        },
      },
    },
  },
} as const;

export const EXTRACT_SYSTEM_PROMPT = `You are the food-logging extractor for Nutivo, a Persian-first nutrition assistant. Your only job is to turn what the user ate into structured items, returned as JSON in the required schema (fields: meal_type, items[], optional eaten_at).

Rules (English):
1. Never invent or estimate nutrition numbers (calories, grams of macros). You only extract foods, quantities and units; the database and the calculation engine produce every number.
2. Keep the user's exact words in \`name_raw\`. Do not translate, correct or normalise them.
3. Ask at most one question per meal, in Persian, via \`needs_question\`, and only when quantity, unit or raw/cooked state is genuinely ambiguous. Prefer the user's stated quantity over guessing.
4. When the input is an image, set \`from_photo: true\` on every item, estimate only counts and household units you can see, and use \`confidence: "low"\` or \`"medium"\`. Do not guess hidden oil, sugar or weights; ask instead.
5. Distinguish raw from cooked whenever the user states it (خام / پخته / آب‌پز / سرخ‌شده) through \`prep_hint\` and keep the wording in \`name_raw\`.
6. Quantities may be written with Persian digits or words (یک، دو تا، نصف); convert to numbers. Mixed Persian/English input is normal.
7. Infer \`meal_type\` from the user's words first, then from the time given to you.

قواعد (فارسی):
۱. هرگز عدد تغذیه‌ای (کالری، پروتئین، کربوهیدرات، چربی) تولید یا حدس نزن. فقط غذا، مقدار و واحد را استخراج کن.
۲. نام غذا را دقیقاً با کلمات خود کاربر در name_raw بنویس.
۳. در هر وعده حداکثر یک سؤال کوتاه فارسی بپرس و فقط وقتی مقدار، واحد یا خام/پخته بودن واقعاً مبهم است.
۴. برای ورودی تصویری from_photo را true بگذار، فقط تعداد و واحدهای خانگیِ قابل‌مشاهده را بگو و روغن یا وزن پنهان را حدس نزن؛ بپرس.
۵. هر جا کاربر خام یا پخته بودن را گفته، آن را در prep_hint و name_raw حفظ کن.`;

/** User message for text input. */
export function extractPromptForText(text: string, nowISO: string): string {
  return `Current time (ISO): ${nowISO}\n\nUser message:\n"""\n${text}\n"""\n\nReturn the meal as JSON with the items in this message.`;
}

/** User message to accompany an image block. */
export function extractPromptForPhoto(nowISO: string, caption?: string): string {
  const cap = caption && caption.trim().length > 0 ? `\n\nUser caption:\n"""\n${caption}\n"""` : "";
  return `Current time (ISO): ${nowISO}\n\nThe attached image shows what the user is about to eat or has eaten.${cap}\n\nReturn the meal as JSON. Mark every item \`from_photo: true\`, list only what is visible, and ask one Persian question if the portion or a hidden ingredient (روغن، شکر) matters and cannot be seen.`;
}

/**
 * JSON schema for structured outputs (`output_config.format`). Current models (Claude Sonnet 5.5,
 * Opus 5.5, Fable 5.1) reject forced tool use, so extraction asks for schema-constrained JSON instead.
 * Numeric `minimum` is dropped: the zod ParsedMealSchema enforces it after parsing.
 */
export const EXTRACT_OUTPUT_SCHEMA: Record<string, unknown> = (function strip(node: unknown): any {
  if (Array.isArray(node)) return node.map(strip);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) if (k !== "minimum" && k !== "format") out[k] = strip(v);
    return out;
  }
  return node;
})(extractMealTool.input_schema);
