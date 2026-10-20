import { MEAL_IDEAS, rankIdeas, type IdeaCandidate } from "./ideas";

const c = (id: string, kcal: number, protein_g: number, slots: IdeaCandidate["slots"], source: IdeaCandidate["source"] = "idea"): IdeaCandidate => ({
  id,
  name_fa: id,
  source,
  slots,
  macros: { kcal, protein_g, carbs_g: 0, fat_g: 0 },
});

describe("rankIdeas", () => {
  const list = [c("light-protein", 350, 38, ["dinner"]), c("heavy", 1100, 30, ["dinner"]), c("snack", 150, 5, ["snack"]), c("rice", 450, 8, ["dinner"])];

  it("prefers protein that fits the remaining calories at dinner", () => {
    const r = rankIdeas({ candidates: list, remaining: { kcal: 600, protein_g: 45 }, slot: "dinner" });
    expect(r[0]?.id).toBe("light-protein");
    expect(r.at(-1)?.id).not.toBe("light-protein");
    expect(r.map((x) => x.id)).not.toContain("heavy");
  });

  it("goes light when the calorie goal is reached", () => {
    const r = rankIdeas({ candidates: list, remaining: { kcal: -100, protein_g: 0 }, slot: "snack" });
    expect(r[0]?.id).toBe("snack");
  });

  it("every idea references seed foods with positive grams", () => {
    for (const idea of MEAL_IDEAS) for (const it of idea.items) expect(it.food_id.startsWith("fa:") && it.grams > 0).toBe(true);
  });
});
