import type { DayTotals, Goals, Macro, MealType, ResolvedItem } from "./schemas";
import { dayTotals, kcalDiscrepancy, sumMacros, type KcalDiscrepancy } from "./calc";

export const MEAL_ORDER: readonly MealType[] = ["breakfast", "lunch", "snack", "dinner"];

/** A resolved item tagged with the meal it belongs to. */
export type ReportItem = ResolvedItem & { meal_type: MealType };

export interface MealSection {
  meal_type: MealType;
  items: ReportItem[];
  macros: Macro;
}

export interface DailyReport {
  date: string;
  totals: DayTotals;
  /** Meals in breakfast → lunch → snack → dinner order; empty meals omitted. */
  per_meal: MealSection[];
  /** Meal with the most kcal, or null when nothing was logged. */
  heaviest_meal: MealType | null;
  top_fat_sources: ReportItem[];
  top_kcal_sources: ReportItem[];
  /** True when any item is estimated or has low confidence: numbers are indicative, not exact. */
  is_partial: boolean;
  discrepancy: KcalDiscrepancy;
}

export interface BuildDailyReportInput {
  /** ISO date (YYYY-MM-DD) the report covers. */
  date: string;
  items: readonly ReportItem[];
  goals: Goals;
  /** How many items to list in each top-sources list. Default 3. */
  topN?: number;
}

/** Pure data shaping for the nightly report. No prose, no LLM. */
export function buildDailyReport({ date, items, goals, topN = 3 }: BuildDailyReportInput): DailyReport {
  const totals = dayTotals(items, goals);

  const per_meal: MealSection[] = MEAL_ORDER.flatMap((meal_type) => {
    const mealItems = items.filter((i) => i.meal_type === meal_type);
    return mealItems.length === 0 ? [] : [{ meal_type, items: mealItems, macros: sumMacros(mealItems.map((i) => i.macros)) }];
  });

  const heaviest = per_meal.reduce<MealSection | null>((best, m) => (best === null || m.macros.kcal > best.macros.kcal ? m : best), null);

  const byDesc = (key: keyof Macro) => [...items].sort((a, b) => b.macros[key] - a.macros[key]).slice(0, topN);

  return {
    date,
    totals,
    per_meal,
    heaviest_meal: heaviest?.meal_type ?? null,
    top_fat_sources: byDesc("fat_g"),
    top_kcal_sources: byDesc("kcal"),
    is_partial: items.some((i) => i.is_estimated || i.confidence === "low"),
    discrepancy: kcalDiscrepancy(totals.macros),
  };
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

export interface StreakInput {
  /** ISO dates (YYYY-MM-DD, or full ISO strings whose date part is used) on which the user logged. */
  logDates: readonly string[];
  /** ISO date for "today". */
  today: string;
  /** Missed days forgiven within any rolling 7-day window. Default 1. */
  graceDaysPerWeek?: number;
}

export interface StreakStatus {
  /** Logged days in the streak that is alive as of today. */
  current: number;
  /** Longest streak ever, same grace rule. */
  longest: number;
  /** True when today has no log yet but the streak is still alive thanks to grace. */
  forgiven_today: boolean;
}

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 7;

function dayIndex(iso: string): number {
  const datePart = iso.slice(0, 10);
  const t = Date.parse(`${datePart}T00:00:00Z`);
  if (Number.isNaN(t)) throw new RangeError(`Invalid ISO date: "${iso}"`);
  return Math.floor(t / DAY_MS);
}

/**
 * Streak with grace: a streak survives a missed day as long as no rolling
 * 7-day window contains more than `graceDaysPerWeek` missed days.
 * Today without a log never shrinks `current` (the day is still open);
 * `forgiven_today` says whether the streak would survive if today stays unlogged.
 * `forgiven_today: false` with `current > 0` and no log today means "log today or lose it".
 */
export function streakStatus({ logDates, today, graceDaysPerWeek = 1 }: StreakInput): StreakStatus {
  const todayIdx = dayIndex(today);
  const logged = new Set(logDates.map(dayIndex).filter((d) => d <= todayIdx));
  if (logged.size === 0) return { current: 0, longest: 0, forgiven_today: false };

  const first = Math.min(...logged);

  // Forward scan for longest: run length resets when a window overflows its grace.
  let longest = 0;
  let run = 0;
  let misses: number[] = [];
  for (let d = first; d <= todayIdx; d++) {
    if (logged.has(d)) {
      run++;
      longest = Math.max(longest, run);
      continue;
    }
    if (d === todayIdx) break; // today is still open; do not let it end a run
    misses = misses.filter((m) => m > d - WINDOW_DAYS);
    misses.push(d);
    if (misses.length > graceDaysPerWeek) {
      run = 0;
      misses = [];
    }
  }

  // Backward scan for current, starting from yesterday: today is still open and
  // can neither break nor (yet) extend the streak on its own.
  let current = 0;
  let runStart = todayIdx;
  let recentMisses: number[] = [];
  for (let d = todayIdx - 1; d >= first; d--) {
    if (logged.has(d)) {
      current++;
      runStart = d;
      continue;
    }
    recentMisses = recentMisses.filter((m) => m < d + WINDOW_DAYS);
    recentMisses.push(d);
    if (recentMisses.length > graceDaysPerWeek) break;
  }

  const todayLogged = logged.has(todayIdx);
  let forgiven_today = false;
  if (todayLogged) {
    current++;
  } else if (current > 0) {
    // Would the streak survive if today ends without a log?
    let missesInWindow = 1; // today
    for (let d = Math.max(runStart, todayIdx - WINDOW_DAYS + 1); d < todayIdx; d++) {
      if (!logged.has(d)) missesInWindow++;
    }
    forgiven_today = missesInWindow <= graceDaysPerWeek;
  }

  return { current, longest: Math.max(longest, current), forgiven_today };
}

// ---------------------------------------------------------------------------
// Report facts: the deterministic answers to the nightly report's questions.
// Everything the analysis text may cite comes from here.
// ---------------------------------------------------------------------------

export type KcalStatus = "under" | "in_range" | "over";

export interface MacroFact {
  consumed: number;
  goal: number;
  /** consumed − goal (negative = still missing). */
  diff: number;
  pct: number;
}

export interface ReportFacts {
  date: string;
  logged: boolean;
  is_partial: boolean;
  kcal: MacroFact & { low: number; high: number; status: KcalStatus };
  protein: MacroFact & { enough: boolean };
  carbs: MacroFact & { balanced: boolean };
  fat: MacroFact & { balanced: boolean };
  /** Share of energy from each macro (0–1), from 4/4/9 kcal per gram. */
  energy_split: { protein: number; carbs: number; fat: number };
  heaviest_meal: { meal_type: MealType; kcal: number; share: number } | null;
  top_kcal: { name: string; kcal: number }[];
  top_fat: { name: string; fat_g: number }[];
  /** Stored kcal differ from macro energy by more than 8% (rounding or uncertain data). */
  kcal_mismatch: { reported: number; from_macros: number; delta_pct: number } | null;
}

/** Calorie band considered "in range": ±10% of the goal. */
export const KCAL_BAND = 0.1;

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;

function fact(consumed: number, goal: number): MacroFact {
  return { consumed: r1(consumed), goal, diff: r1(consumed - goal), pct: goal > 0 ? consumed / goal : 0 };
}

export function reportFacts(report: DailyReport, goals: Goals): ReportFacts {
  const m = report.totals.macros;
  const low = r0(goals.kcal * (1 - KCAL_BAND));
  const high = r0(goals.kcal * (1 + KCAL_BAND));
  const status: KcalStatus = m.kcal < low ? "under" : m.kcal > high ? "over" : "in_range";
  const energy = 4 * m.protein_g + 4 * m.carbs_g + 9 * m.fat_g;
  const heaviest = report.per_meal.find((p) => p.meal_type === report.heaviest_meal);
  const name = (i: ReportItem) => i.food.name_fa;
  const mismatch = Math.abs(report.discrepancy.delta_pct) > 0.08 && m.kcal > 0;

  return {
    date: report.date,
    logged: report.per_meal.length > 0,
    is_partial: report.is_partial,
    kcal: { ...fact(r0(m.kcal), goals.kcal), consumed: r0(m.kcal), diff: r0(m.kcal - goals.kcal), low, high, status },
    protein: { ...fact(m.protein_g, goals.protein_g), enough: m.protein_g >= goals.protein_g * 0.9 },
    // "Balanced" against the user's own targets: within ±15% of the gram goal.
    carbs: { ...fact(m.carbs_g, goals.carbs_g), balanced: Math.abs(m.carbs_g - goals.carbs_g) <= goals.carbs_g * 0.15 },
    fat: { ...fact(m.fat_g, goals.fat_g), balanced: Math.abs(m.fat_g - goals.fat_g) <= goals.fat_g * 0.15 },
    energy_split:
      energy > 0
        ? { protein: (4 * m.protein_g) / energy, carbs: (4 * m.carbs_g) / energy, fat: (9 * m.fat_g) / energy }
        : { protein: 0, carbs: 0, fat: 0 },
    heaviest_meal: heaviest ? { meal_type: heaviest.meal_type, kcal: r0(heaviest.macros.kcal), share: m.kcal > 0 ? heaviest.macros.kcal / m.kcal : 0 } : null,
    top_kcal: report.top_kcal_sources.filter((i) => i.macros.kcal > 0).map((i) => ({ name: name(i), kcal: r0(i.macros.kcal) })),
    top_fat: report.top_fat_sources.filter((i) => i.macros.fat_g >= 1).map((i) => ({ name: name(i), fat_g: r1(i.macros.fat_g) })),
    kcal_mismatch: mismatch ? { reported: r0(m.kcal), from_macros: r0(report.discrepancy.expected), delta_pct: report.discrepancy.delta_pct } : null,
  };
}
