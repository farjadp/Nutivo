import { daySeed } from "../mascot";
import { toPersianDigits } from "../persian";
import { holidayOn, type Holiday } from "./calendar";
import {
  ASIDE_WEEK_GOOD,
  CHAPTER_ONE,
  CHAPTER_POINTS,
  NAKHONAK_LINES,
  POINTS,
  RANKS,
  RETRACT_POINTS,
  STORIES,
  TRAPS,
  type Moment,
  type NakhonakMood,
  type Outcome,
  type Story,
  type TrapId,
} from "./content";

/** One stored day (table nakhonak_days). outcome is null until the user answers. */
export interface NakhonakPlay {
  date: string;
  storyId: string;
  outcome: Outcome | null;
  points: number;
}

export interface NakhonakDayFacts {
  date: string;
  kcal: number;
  meals: number;
}

export interface NakhonakContext {
  /** The user's local date, YYYY-MM-DD. */
  date: string;
  /** The user's local hour, 0–23. */
  hour: number;
  goalKcal: number | null;
  today: { kcal: number; meals: number; dinnerLogged: boolean };
  /** Days before today (any order); days without logs may be missing. */
  recent: NakhonakDayFacts[];
  /** Every stored play for the user, today's included if it exists. */
  plays: NakhonakPlay[];
}

export type NakhonakPlan =
  | { kind: "truce"; holiday: Holiday }
  | { kind: "paused" }
  | { kind: "chapter"; storyId: typeof CHAPTER_ONE.id }
  | { kind: "story"; storyId: string };

const OVER = 1.1;
const LIGHT = 0.6;
const RECENT_STORIES = 8;
export const CHAPTER_DAY = 30;

const PRIORITY: Moment[] = ["morningAfterOver", "overToday", "lateUnlogged", "eveningLight", "reportReady", "any"];

export function storyById(id: string): Story | undefined {
  return STORIES.find((s) => s.id === id);
}

function previousDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** What kind of moment the user is in right now, most specific first. */
export function momentsNow(ctx: NakhonakContext): Moment[] {
  const goal = ctx.goalKcal;
  const out: Moment[] = [];
  const yesterday = ctx.recent.find((d) => d.date === previousDate(ctx.date));
  if (goal && ctx.hour < 12 && yesterday && yesterday.meals > 0 && yesterday.kcal > goal * OVER) out.push("morningAfterOver");
  if (goal && ctx.today.kcal > goal * OVER) out.push("overToday");
  // Only when something was logged: an empty day may be a fast or an illness, not a hidden meal.
  if (ctx.hour >= 21 && ctx.today.meals > 0 && !ctx.today.dinnerLogged) out.push("lateUnlogged");
  if (goal && ctx.hour >= 19 && ctx.today.meals > 0 && ctx.today.kcal < goal * LIGHT) out.push("eveningLight");
  if (ctx.hour >= 21 && ctx.today.meals > 0) out.push("reportReady");
  out.push("any");
  return PRIORITY.filter((m) => out.includes(m));
}

/**
 * Safety: if the last week's logged days are far below the goal, ناخنک steps back.
 * A story about skipping meals is the last thing such a week needs.
 */
export function shouldPause(ctx: NakhonakContext): boolean {
  const goal = ctx.goalKcal;
  if (!goal) return false;
  const week = new Set<string>();
  let d = ctx.date;
  for (let i = 0; i < 7; i++) {
    d = previousDate(d);
    week.add(d);
  }
  const logged = ctx.recent.filter((r) => week.has(r.date) && r.meals > 0);
  if (logged.length < 3) return false;
  const avg = logged.reduce((s, r) => s + r.kcal, 0) / logged.length;
  return avg < goal * 0.5;
}

function played(plays: NakhonakPlay[], before: string): NakhonakPlay[] {
  return plays.filter((p) => p.date < before && p.outcome !== null && p.outcome !== "skip");
}

function fits(story: Story, moments: Moment[]): boolean {
  return story.moments.some((m) => moments.includes(m));
}

function pickStory(ctx: NakhonakContext, moments: Moment[]): Story {
  const recent = new Set(
    [...ctx.plays]
      .filter((p) => p.date < ctx.date)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, RECENT_STORIES)
      .map((p) => p.storyId),
  );
  const seed = Math.abs(daySeed(ctx.date, 7));
  for (const m of moments) {
    const fresh = STORIES.filter((s) => s.moments.includes(m) && !recent.has(s.id));
    if (fresh.length) return fresh[seed % fresh.length]!;
  }
  const anyStory = STORIES.filter((s) => s.moments.includes("any"));
  return anyStory[seed % anyStory.length]!;
}

/**
 * Today's plan. The server stores the chosen story the first time and passes it back as
 * `existing`, so the app and the bot show the same story all day.
 */
export function planToday(ctx: NakhonakContext, existing?: NakhonakPlay): NakhonakPlan {
  const settled = existing && existing.outcome !== null;
  if (existing && settled) {
    return existing.storyId === CHAPTER_ONE.id ? { kind: "chapter", storyId: CHAPTER_ONE.id } : { kind: "story", storyId: existing.storyId };
  }
  const holiday = holidayOn(ctx.date);
  if (holiday) return { kind: "truce", holiday };
  if (shouldPause(ctx)) return { kind: "paused" };

  const past = played(ctx.plays, ctx.date);
  const hadChapter = ctx.plays.some((p) => p.storyId === CHAPTER_ONE.id && p.outcome !== null);
  if (!hadChapter && past.length + 1 >= CHAPTER_DAY) return { kind: "chapter", storyId: CHAPTER_ONE.id };

  const moments = momentsNow(ctx);
  const kept = existing ? storyById(existing.storyId) : undefined;
  if (kept && fits(kept, moments)) return { kind: "story", storyId: kept.id };
  return { kind: "story", storyId: pickStory(ctx, moments).id };
}

/** Can a stored, unanswered story be swapped for a better fit? Not once it went out on Telegram. */
export function canReplan(existing: NakhonakPlay | undefined, sentToTelegram: boolean): boolean {
  return !existing || (existing.outcome === null && !sentToTelegram);
}

/** The line shown above the story on milestone days. */
export function introFor(ctx: NakhonakContext): string | null {
  const past = played(ctx.plays, ctx.date);
  if (past.length === 0) return NAKHONAK_LINES.intro;
  if (past.length + 1 === 5) {
    const first = [...past].sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    const title = first ? storyById(first.storyId)?.title : undefined;
    if (title) return NAKHONAK_LINES.day5.replace("{title}", title);
  }
  return null;
}

export interface NakhonakResult {
  outcome: Outcome;
  points: number;
  mood: NakhonakMood;
  reply: string;
  nuti: string | null;
  retract: boolean;
  logPrompt: boolean;
  /** Milestone line after the answer (day 10). */
  extra: string | null;
}

export const SKIP_CHOICE = "x";
export const CHAPTER_CHOICE = "ok";

/** Resolve an answer. Returns null for a choice that doesn't exist. */
export function answer(storyId: string, choiceId: string, ctx: NakhonakContext): NakhonakResult | null {
  if (choiceId === SKIP_CHOICE) {
    return { outcome: "skip", points: 0, mood: "gentle", reply: NAKHONAK_LINES.skip, nuti: null, retract: false, logPrompt: false, extra: null };
  }
  if (storyId === CHAPTER_ONE.id) {
    if (choiceId !== CHAPTER_CHOICE) return null;
    return { outcome: "feeling", points: CHAPTER_POINTS, mood: "gentle", reply: CHAPTER_ONE.reply, nuti: null, retract: false, logPrompt: false, extra: null };
  }
  const story = storyById(storyId);
  const choice = story?.choices.find((c) => c.id === choiceId);
  if (!story || !choice) return null;

  const retract = Boolean(choice.retract);
  const mood: NakhonakMood = retract
    ? "gentle"
    : choice.outcome === "fall"
      ? "smug"
      : choice.outcome === "spot"
        ? "beaten"
        : choice.outcome === "feeling"
          ? "gentle"
          : "sly";

  let extra: string | null = null;
  const past = played(ctx.plays, ctx.date);
  if (past.length + 1 === 10) {
    const spotted = trapCounts([...past, { date: ctx.date, storyId, outcome: choice.outcome, points: 0 }]);
    const best = (Object.entries(spotted) as [TrapId, number][]).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] > 0) extra = NAKHONAK_LINES.day10.replace("{trap}", TRAPS[best[0]].name);
  }

  return {
    outcome: choice.outcome,
    points: retract ? RETRACT_POINTS : POINTS[choice.outcome],
    mood,
    reply: choice.reply,
    nuti: choice.nuti ?? null,
    retract,
    logPrompt: Boolean(choice.logPrompt),
    extra,
  };
}

function trapCounts(plays: NakhonakPlay[]): Record<TrapId, number> {
  const out = Object.fromEntries(Object.keys(TRAPS).map((k) => [k, 0])) as Record<TrapId, number>;
  for (const p of plays) {
    if (p.outcome !== "spot") continue;
    const s = storyById(p.storyId);
    if (s) out[s.trap] += 1;
  }
  return out;
}

export interface NakhonakProgress {
  score: number;
  playedDays: number;
  rank: string;
  nextRank: { title: string; at: number } | null;
  traps: { id: TrapId; name: string; explain: string; found: number; mastered: boolean }[];
  chapter: { title: string; text: string; unlocked: boolean; daysLeft: number };
}

/** «پرونده‌ی ناخنک»: score, rank, which traps the user has caught, the chapter. */
export function progressOf(plays: NakhonakPlay[]): NakhonakProgress {
  const score = plays.reduce((s, p) => s + (p.outcome ? p.points : 0), 0);
  const playedDays = plays.filter((p) => p.outcome !== null && p.outcome !== "skip").length;
  const rankIdx = RANKS.reduce((idx, r, i) => (score >= r.min ? i : idx), 0);
  const next = RANKS[rankIdx + 1];
  const counts = trapCounts(plays);
  const unlocked = plays.some((p) => p.storyId === CHAPTER_ONE.id && p.outcome !== null);
  return {
    score,
    playedDays,
    rank: RANKS[rankIdx]!.title,
    nextRank: next ? { title: next.title, at: next.min } : null,
    traps: (Object.keys(TRAPS) as TrapId[]).map((id) => ({ ...TRAPS[id], found: counts[id], mastered: counts[id] >= 3 })),
    chapter: { title: CHAPTER_ONE.title, text: unlocked ? CHAPTER_ONE.text : "", unlocked, daysLeft: Math.max(0, CHAPTER_DAY - playedDays) },
  };
}

/**
 * Scenario 5: over today, but the week is in range. ناخنک is right about the big picture.
 * Returns null when it doesn't apply.
 */
export function weekGoodAside(ctx: NakhonakContext): { who: "nuti" | "nakhonak"; text: string }[] | null {
  const goal = ctx.goalKcal;
  if (!goal || ctx.today.kcal <= goal) return null;
  const week = ctx.recent.filter((r) => r.meals > 0).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  if (week.length < 4) return null;
  const kcal = [...week.map((r) => r.kcal), ctx.today.kcal];
  const avg = kcal.reduce((s, k) => s + k, 0) / kcal.length;
  if (Math.abs(avg - goal) > goal * 0.1) return null;
  const over = toPersianDigits(Math.round(ctx.today.kcal - goal));
  return ASIDE_WEEK_GOOD.map((l) => ({ who: l.who, text: l.text.replace("{over}", over) }));
}
