import type { RepeatMeal } from "@nutivo/core";
import type { LoggedItem, QuickMeal } from "@/entities/day/sample";
import { MEAL_LABEL } from "../ui/meal-list";

let seq = 0;

/** Chip label: «صبحانه دیروز», or the first two foods and a count of the rest. */
export function repeatLabel(m: RepeatMeal): string {
  if (m.yesterday) return `${MEAL_LABEL[m.meal_type]} دیروز`;
  const names = [...new Set(m.items.map((i) => i.food.name_fa))];
  const head = names.slice(0, 2).join(" و ");
  return names.length > 2 ? `${head} +${names.length - 2}` : head;
}

/** Turns history suggestions into composer chips. Each tap builds fresh items with the same foods and amounts. */
export function repeatsToQuick(repeats: RepeatMeal[]): QuickMeal[] {
  return repeats.map((m) => ({
    id: m.id,
    label: repeatLabel(m),
    meal_type: m.meal_type,
    yesterday: m.yesterday,
    iconFood: [...m.items].sort((a, b) => b.macros.kcal - a.macros.kcal)[0]?.food,
    build: () =>
      m.items.map(
        (i): LoggedItem => ({
          ...i,
          key: `r-${Date.now().toString(36)}-${seq++}`,
          meal_type: m.meal_type,
          from_photo: false,
          needs_question: undefined,
        }),
      ),
  }));
}
