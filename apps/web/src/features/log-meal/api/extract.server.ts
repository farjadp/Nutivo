import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACT_SYSTEM_PROMPT,
  EXTRACT_TOOL_NAME,
  extractMealTool,
  extractPromptForPhoto,
  extractPromptForText,
  ParsedMealSchema,
  type ParsedMeal,
} from "@nutivo/core";
import { anthropic, extractModel } from "@/lib/ai/client";

export class ExtractError extends Error {
  constructor(readonly userMessage: string, cause?: unknown) {
    super(userMessage, { cause });
    this.name = "ExtractError";
  }
}

type ImageInput = { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };

/** Asks Claude to turn text or a photo into items. Returns structure only; no nutrition numbers. */
export interface ExtractResult {
  meal: ParsedMeal;
  model: string;
  ms: number;
  usage: { input_tokens: number; output_tokens: number };
}

export async function extractMeal(input: { text?: string; image?: ImageInput; nowISO: string }): Promise<ExtractResult> {
  const content: Anthropic.ContentBlockParam[] = [];
  if (input.image) {
    content.push({ type: "image", source: { type: "base64", media_type: input.image.mediaType, data: input.image.base64 } });
    content.push({ type: "text", text: extractPromptForPhoto(input.nowISO, input.text) });
  } else if (input.text?.trim()) {
    content.push({ type: "text", text: extractPromptForText(input.text, input.nowISO) });
  } else {
    throw new ExtractError("چیزی برای ثبت نوشته نشده.");
  }

  let res: Anthropic.Message;
  const model = await extractModel();
  const t0 = Date.now();
  try {
    const client = await anthropic();
    res = await client.messages.create({
      model,
      max_tokens: 1024,
      system: EXTRACT_SYSTEM_PROMPT,
      tools: [extractMealTool as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: EXTRACT_TOOL_NAME },
      messages: [{ role: "user", content }],
    });
  } catch (err) {
    throw new ExtractError("ارتباط با سرویس هوش مصنوعی برقرار نشد. چند لحظه بعد دوباره امتحان کن.", err);
  }

  const call = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === EXTRACT_TOOL_NAME);
  if (!call) throw new ExtractError("نتوانستم غذاها را تشخیص بدهم. کمی دقیق‌تر بنویس.");

  const parsed = ParsedMealSchema.safeParse(call.input);
  if (!parsed.success) throw new ExtractError("پاسخ سرویس قابل خواندن نبود. دوباره امتحان کن.", parsed.error);
  if (parsed.data.items.length === 0) throw new ExtractError("غذایی پیدا نکردم. مثلاً بنویس «دو کفگیر برنج و یک تکه مرغ».");
  if (input.image) parsed.data.items.forEach((i) => (i.from_photo = true));
  return {
    meal: parsed.data,
    model,
    ms: Date.now() - t0,
    usage: { input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens },
  };
}
