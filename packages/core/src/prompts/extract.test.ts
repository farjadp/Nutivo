import { extractMealTool, EXTRACT_SYSTEM_PROMPT, extractPromptForText, extractPromptForPhoto, EXTRACT_TOOL_NAME } from "./extract";
import { ParsedMealSchema } from "../schemas";

describe("extract prompt", () => {
  it("tool schema mirrors ParsedMealSchema", () => {
    expect(extractMealTool.name).toBe("extract_meal");
    expect(EXTRACT_TOOL_NAME).toBe("extract_meal");
    const props = extractMealTool.input_schema.properties;
    expect(props.meal_type.enum).toEqual(ParsedMealSchema.shape.meal_type.options);
    const itemProps = props.items.items.properties;
    expect(Object.keys(itemProps).sort()).toEqual(Object.keys(ParsedMealSchema.shape.items.element.shape).sort());
    expect(itemProps.prep_hint.enum).toEqual(["fried", "grilled", "boiled", "raw", "unknown"]);
    // a sample tool output validates against the zod schema
    const sample = {
      meal_type: "lunch",
      items: [{ name_raw: "دو کفگیر چلو", qty: 2, unit: "کفگیر", confidence: "high" }],
    };
    expect(ParsedMealSchema.safeParse(sample).success).toBe(true);
  });

  it("system prompt states the core rules in both languages", () => {
    expect(EXTRACT_SYSTEM_PROMPT).toMatch(/never invent/i);
    expect(EXTRACT_SYSTEM_PROMPT).toContain("name_raw");
    expect(EXTRACT_SYSTEM_PROMPT).toMatch(/at most one question/i);
    expect(EXTRACT_SYSTEM_PROMPT).toContain("from_photo");
    expect(EXTRACT_SYSTEM_PROMPT).toMatch(/raw from cooked/i);
    expect(EXTRACT_SYSTEM_PROMPT).toContain("حدس نزن");
  });

  it("user prompts embed the text and the time", () => {
    const t = extractPromptForText("دو تا تخم مرغ آب‌پز", "2026-10-20T08:00:00+03:30");
    expect(t).toContain("دو تا تخم مرغ آب‌پز");
    expect(t).toContain("2026-10-20T08:00:00+03:30");
    const p = extractPromptForPhoto("2026-10-20T13:00:00Z");
    expect(p).toContain("from_photo: true");
    expect(extractPromptForPhoto("now", "ناهار امروز")).toContain("ناهار امروز");
  });
});
