import { suggestGoals, bmrMifflinStJeor, tdee } from "./goals";

describe("suggestGoals", () => {
  it("male 30y 180cm 80kg moderate, lose", () => {
    const input = { sex: "male" as const, age: 30, height_cm: 180, weight_kg: 80, activity: "moderate" as const, goal: "lose" as const };
    expect(bmrMifflinStJeor(input)).toBe(1780);
    expect(tdee(input)).toBeCloseTo(2759);
    const g = suggestGoals(input);
    expect(g).toEqual({ kcal: 2345, protein_g: 144, fat_g: 65, carbs_g: 296 });
    // macros re-add to within rounding of kcal
    expect(Math.abs(4 * g.protein_g + 4 * g.carbs_g + 9 * g.fat_g - g.kcal)).toBeLessThanOrEqual(4);
  });

  it("applies the female kcal floor", () => {
    const g = suggestGoals({ sex: "female", age: 60, height_cm: 150, weight_kg: 45, activity: "sedentary", goal: "lose" });
    expect(g.kcal).toBe(1200);
  });

  it("maintain uses 1.6 g/kg protein and no deficit", () => {
    const g = suggestGoals({ sex: "female", age: 28, height_cm: 165, weight_kg: 60, activity: "light", goal: "maintain" });
    expect(g.protein_g).toBe(96);
    expect(g.kcal).toBe(Math.round((600 + 1031.25 - 140 - 161) * 1.375));
  });
});
