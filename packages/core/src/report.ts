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
