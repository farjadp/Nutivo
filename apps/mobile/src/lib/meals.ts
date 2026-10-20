import type { MealType } from "./api";

export const MEALS: { v: MealType; l: string }[] = [
  { v: "breakfast", l: "صبحانه" },
  { v: "lunch", l: "ناهار" },
  { v: "snack", l: "میان‌وعده" },
  { v: "dinner", l: "شام" },
];
export const mealLabel = (m: MealType) => MEALS.find((x) => x.v === m)!.l;
