import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FOOD_ICON_NAMES, FOOD_ICONS, foodIconName, foodIconSvg } from "./food-icons";

const seedIds = readFileSync(resolve(__dirname, "../../../db/seed/foods_fa.csv"), "utf8")
  .split("\n")
  .slice(1)
  .map((l) => l.split(",")[0])
  .filter(Boolean);

describe("food icons", () => {
  it("every reviewed Persian food has its own specific icon (no fallback)", () => {
    expect(seedIds.length).toBe(25);
    for (const id of seedIds) expect(foodIconName({ id }), id).not.toBe("dish");
  });

  it("maps everyday names in Persian and English", () => {
    const cases: [string, string][] = [
      ["چای", "tea"], ["یک استکان چای شیرین", "tea"], ["قهوه", "coffee"], ["شیر کم‌چرب", "milk"], ["شیرینی", "cake"],
      ["سیب", "apple"], ["سیب‌زمینی سرخ‌کرده", "potato"], ["انار", "pomegranate"], ["پسته", "nuts"],
      ["پیتزا", "pizza"], ["همبرگر", "sandwich"], ["ماهی قزل‌آلا", "fish"], ["مرغ سرخ شده", "chicken-fried"],
      ["Greek yogurt", "yogurt"], ["Banana, raw", "banana"], ["Spaghetti", "pasta"], ["Orange juice", "juice"],
      ["Potato chips", "chips"], ["Dark chocolate", "chocolate"], ["Something unknown", "dish"],
    ];
    for (const [name, icon] of cases) expect(foodIconName({ name_fa: name, name_en: name }), name).toBe(icon);
  });

  it("every icon has a Persian label and stays inside the 24 grid", () => {
    for (const n of FOOD_ICON_NAMES) {
      const def = FOOD_ICONS[n];
      expect(def.fa.length).toBeGreaterThan(0);
      expect(def.els.length).toBeGreaterThan(0);
      // Ellipse rotation angles are degrees, not coordinates.
      const geometry = def.els.map((el) => ("e" in el && el.e ? { e: el.e.slice(0, 4) } : el));
      const nums = JSON.stringify(geometry).match(/-?\d+(\.\d+)?/g)!.map(Number);
      // absolute coordinates live in 0..24 (relative path deltas can be negative, so only check the upper bound)
      expect(Math.max(...nums), n).toBeLessThanOrEqual(24);
    }
  });

  it("serialises to a standalone SVG", () => {
    const svg = foodIconSvg("rice", { size: 48, stroke: "#007F71" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('stroke="#007F71"');
    expect(svg).toContain('aria-label="چلو"');
    expect(foodIconSvg("kebab-joojeh")).toContain('transform="rotate(-35 12 12)"');
  });
});
