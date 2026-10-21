/** Contract between the web app's bot API (apps/web/src/app/api/bot) and the Telegram bot (apps/bot). */
import type { Goals, MealType } from "./schemas";
import type { ReportFacts } from "./report";
import type { ReportAnalysis } from "./prompts/report";

/** Shapes the bot API returns. Kept renderer-neutral so a mobile app can use them too. */
export interface TgUser {
  id: number;
  first_name?: string;
  username?: string;
  language_code?: string;
}

export interface DraftItemView {
  idx: number;
  said: string;
  food: string | null;
  qty: number;
  unit: string;
  grams: number | null;
  kcal: number | null;
  protein_g: number | null;
  estimated: boolean;
  question: string | null;
}

export interface DraftView {
  id: string;
  meal_type: MealType;
  items: DraftItemView[];
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  estimated: boolean;
  /** Every item has a food and grams, so it can be saved. */
  ready: boolean;
  question: string | null;
  from_photo: boolean;
}

export interface DayView {
  date: string;
  today: string;
  goals: Goals;
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  remaining: { kcal: number; protein_g: number };
  meals: { meal_type: MealType; kcal: number; items: { name: string; kcal: number; estimated: boolean }[] }[];
  streak: number;
  complete: boolean;
  repeats: { id: string; label: string; meal_type: MealType }[];
}

export type BotResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: "not_linked" | "no_goals" | "bad_request" | "not_found" | "server" };

// ---------------------------------------------------------------------------
// Nightly report in Telegram (shared by the bot and the web app's nightly push)
// ---------------------------------------------------------------------------


export interface ReportView {
  date: string;
  /** «امروز» / «دیروز» / weekday. */
  day_label: string;
  facts: ReportFacts;
  analysis: ReportAnalysis | null;
}

const fa = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const N = (x: number) => fa.format(Math.round(x));
const H = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const MEAL_FA: Record<MealType, string> = { breakfast: "صبحانه", lunch: "ناهار", snack: "میان‌وعده", dinner: "شام" };

/** Short caption under the day card (Telegram captions are limited to 1024 characters). */
export function reportCaption(v: ReportView): string {
  const k = v.facts.kcal;
  const status = k.status === "in_range" ? "در محدوده هدف" : k.status === "under" ? "کمتر از محدوده هدف" : "بیشتر از محدوده هدف";
  const lines = [
    `<b>گزارش ${H(v.day_label)}</b>${v.facts.is_partial ? " · تخمینی" : ""}`,
    `کالری ${N(k.consumed)} از ${N(k.goal)}، ${status}.`,
    `پروتئین ${N(v.facts.protein.consumed)} از ${N(v.facts.protein.goal)} گرم${v.facts.protein.enough ? "، کافی بود." : "."}`,
  ];
  if (v.analysis?.strength) lines.push("", `<b>نقطه قوت:</b> ${H(v.analysis.strength)}`);
  if (v.analysis?.priority) lines.push(`<b>اولویت فردا:</b> ${H(v.analysis.priority)}`);
  return lines.join("\n").slice(0, 1000);
}

/** The full report as a chat message: the founder's four sections, compact. */
export function reportText(v: ReportView): string {
  const f = v.facts;
  const k = f.kcal;
  const lines = [`<b>گزارش تغذیه ${H(v.day_label)}</b>${f.is_partial ? " · <i>بخشی از مقدارها تخمینی است</i>" : ""}`, ""];
  lines.push(
    "<b>۱. کالری</b>",
    `${N(k.consumed)} از ${N(k.goal)} (محدوده ${N(k.low)} تا ${N(k.high)})، ${k.diff <= 0 ? `${N(-k.diff)} مانده` : `${N(k.diff)} بیشتر`}.`,
    "",
    "<b>۲. ماکروها</b>",
    `پروتئین ${N(f.protein.consumed)}/${N(f.protein.goal)} گرم (${f.protein.diff >= 0 ? "+" : "−"}${N(Math.abs(f.protein.diff))})`,
    `کربوهیدرات ${N(f.carbs.consumed)}/${N(f.carbs.goal)} گرم (${f.carbs.diff >= 0 ? "+" : "−"}${N(Math.abs(f.carbs.diff))})`,
    `چربی ${N(f.fat.consumed)}/${N(f.fat.goal)} گرم (${f.fat.diff >= 0 ? "+" : "−"}${N(Math.abs(f.fat.diff))})`,
  );
  if (f.heaviest_meal) {
    lines.push("", "<b>۳. بیشترین سهم</b>", `پرکالری‌ترین وعده: ${MEAL_FA[f.heaviest_meal.meal_type]} (${N(f.heaviest_meal.kcal)} کالری)`);
    if (f.top_kcal.length) lines.push(`کالری: ${f.top_kcal.map((t) => `${H(t.name.replace(/\s*\(.*?\)/g, ""))} ${N(t.kcal)}`).join("، ")}`);
    if (f.top_fat.length) lines.push(`چربی: ${f.top_fat.map((t) => `${H(t.name.replace(/\s*\(.*?\)/g, ""))} ${N(t.fat_g)} گرم`).join("، ")}`);
  }
  if (v.analysis) {
    lines.push("", "<b>۴. تحلیل</b>", ...v.analysis.analysis.map(H));
    if (v.analysis.tomorrow.length) lines.push("", "<b>برای فردا</b>", ...v.analysis.tomorrow.map((t) => `• ${H(t)}`));
    if (v.analysis.strength) lines.push("", `<b>نقطه قوت:</b> ${H(v.analysis.strength)}`);
    if (v.analysis.priority) lines.push(`<b>اولویت فردا:</b> ${H(v.analysis.priority)}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Mobile app (apps/web/src/app/api/app ↔ apps/mobile)
// ---------------------------------------------------------------------------

/** One saved item as the app's day view and edit sheet need it. Numbers are the ones frozen at save time. */
export interface AppItem {
  id: string;
  meal_type: MealType;
  name: string;
  said: string;
  food_id: string;
  qty: number;
  unit: string;
  grams: number;
  kcal: number;
  protein_g: number;
  estimated: boolean;
}

export interface AppDay {
  day: DayView;
  items: AppItem[];
  /** Oldest to today, for the day strip. */
  strip: { date: string; logged: boolean; complete: boolean }[];
}

/** What «من» shows and the profile form starts from. Body fields are null for an account without goals. */
export interface AppProfile {
  email: string | null;
  sex: "male" | "female" | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: "sedentary" | "light" | "moderate" | "active" | "very_active" | null;
  goal: "lose" | "maintain" | "gain" | null;
  goals: Goals | null;
  nuti_enabled: boolean;
  /** «@username», a first name, or null when the bot isn't linked. */
  telegram: string | null;
}
