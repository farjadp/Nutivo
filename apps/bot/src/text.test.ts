import type { DraftView } from "@nutivo/core";
import { bar, draftCard, esc, short } from "./text";
import { draftKeyboard, nakhonakKeyboard } from "./bot";

const draft: DraftView = {
  id: "00000000-0000-4000-8000-000000000000",
  meal_type: "lunch",
  items: [
    { idx: 0, said: "زرشک پلو", food: "زرشک پلو", qty: 1, unit: "بشقاب", grams: 300, kcal: 570, protein_g: 10, estimated: true, question: null },
    { idx: 1, said: "گوجه <کبابی>", food: "گوجه کبابی", qty: 2, unit: "عدد", grams: null, kcal: null, protein_g: null, estimated: true, question: null },
  ],
  totals: { kcal: 570, protein_g: 10, carbs_g: 90, fat_g: 15 },
  estimated: true,
  ready: false,
  question: "برنج چند کفگیر بود؟",
  from_photo: true,
};

describe("bot text", () => {
  it("escapes HTML and shortens dish names", () => {
    expect(esc("<b>&")).toBe("&lt;b&gt;&amp;");
    expect(short("جوجه‌کباب (سینه، پخته)")).toBe("جوجه‌کباب");
  });

  it("draws a 10-cell bar", () => {
    expect(bar(0.37)).toBe("▰▰▰▰▱▱▱▱▱▱");
    expect(bar(1.4)).toBe("▰".repeat(10));
  });

  it("renders a draft card with Persian numbers, estimates and the missing weight", () => {
    const t = draftCard(draft);
    expect(t).toContain("تأیید ناهار");
    expect(t).toContain("≈۵۷۰");
    expect(t).toContain("وزن؟");
    expect(t).toContain("برنج چند کفگیر بود؟");
    expect(t).not.toMatch(/[0-9]/);
  });

  it("keeps callback data within Telegram's 64-byte limit and blocks saving until ready", () => {
    const kb = draftKeyboard(draft).inline_keyboard.flat();
    for (const b of kb) if ("callback_data" in b) expect(Buffer.byteLength(b.callback_data ?? "")).toBeLessThanOrEqual(64);
    expect(kb.some((b) => b.text === "اول وزن‌ها")).toBe(true);
  });
});

describe("ناخنک buttons", () => {
  it("lays out one choice per row, within the callback limit", () => {
    const kb = nakhonakKeyboard({
      text: "x",
      keyboard: [[{ text: "الف", callback_data: "nk:2026-10-21:a" }], [{ text: "امروز حوصله ندارم", callback_data: "nk:2026-10-21:x" }]],
    })!;
    const rows = kb.inline_keyboard.filter((r) => r.length);
    expect(rows).toHaveLength(2);
    for (const r of rows) for (const b of r) if ("callback_data" in b) expect(Buffer.byteLength(b.callback_data ?? "")).toBeLessThanOrEqual(64);
    expect(nakhonakKeyboard({ text: "x", keyboard: null })).toBeUndefined();
  });
});
