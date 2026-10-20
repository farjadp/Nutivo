import type { Goals } from "./schemas";

export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalDirection = "lose" | "maintain" | "gain";

export interface SuggestGoalsInput {
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity: Activity;
  goal: GoalDirection;
}

export const ACTIVITY_MULTIPLIER: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const PROTEIN_G_PER_KG: Record<GoalDirection, number> = { lose: 1.8, maintain: 1.6, gain: 1.8 };
const KCAL_ADJUST: Record<GoalDirection, number> = { lose: 0.85, maintain: 1, gain: 1.1 };
const MIN_KCAL: Record<Sex, number> = { female: 1200, male: 1500 };
const FAT_KCAL_SHARE = 0.25;

/** Mifflin-St Jeor resting energy expenditure. */
export function bmrMifflinStJeor({ sex, age, height_cm, weight_kg }: Omit<SuggestGoalsInput, "activity" | "goal">): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function tdee(input: Omit<SuggestGoalsInput, "goal">): number {
  return bmrMifflinStJeor(input) * ACTIVITY_MULTIPLIER[input.activity];
}

/**
 * Suggested daily goals.
 * kcal: TDEE × 0.85 (lose, floored at 1200 F / 1500 M), × 1 (maintain), × 1.1 (gain).
 * Protein: 1.8 g/kg (lose, gain), 1.6 g/kg (maintain). Fat: 25% of kcal. Carbs: remainder.
 */
export function suggestGoals(input: SuggestGoalsInput): Goals {
  const kcal = Math.round(Math.max(tdee(input) * KCAL_ADJUST[input.goal], MIN_KCAL[input.sex]));
  const protein_g = Math.round(PROTEIN_G_PER_KG[input.goal] * input.weight_kg);
  const fat_g = Math.round((kcal * FAT_KCAL_SHARE) / 9);
  const carbs_g = Math.max(0, Math.round((kcal - 4 * protein_g - 9 * fat_g) / 4));
  return { kcal, protein_g, carbs_g, fat_g };
}
