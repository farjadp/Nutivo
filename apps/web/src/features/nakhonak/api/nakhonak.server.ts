import "server-only";
import {
  CHAPTER_CHOICE,
  CHAPTER_ONE,
  NAKHONAK_LINES,
  SKIP_CHOICE,
  answer,
  canReplan,
  introFor,
  planToday,
  progressOf,
  storyById,
  weekGoodAside,
  type AppNakhonak,
  type AppNakhonakToday,
  type NakhonakContext,
  type NakhonakPlan,
  type NakhonakPlay,
  type Outcome,
} from "@nutivo/core";
import { loadDayFor } from "@/features/today/api/load-day.server";
import { adminClient } from "@/lib/supabase/admin";

/** «حالت شیطان» (ناخنک): picks and stores one story per user per local day, shared by the app and the bot. */

interface DayRow {
  local_date: string;
  story_id: string;
  choice: string | null;
  outcome: Outcome | null;
  points: number;
  sent_telegram_at: string | null;
}

const hourIn = (tz: string, at: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(at));

export async function nakhonakEnabledFor(userId: string): Promise<boolean> {
  const { data } = await adminClient().from("profiles").select("nakhonak_enabled").eq("id", userId).maybeSingle();
  return data?.nakhonak_enabled ?? false;
}

export async function setNakhonakEnabled(userId: string, on: boolean): Promise<boolean> {
  const { error } = await adminClient().from("profiles").upsert({ id: userId, nakhonak_enabled: on });
  return !error;
}

async function rowsFor(userId: string): Promise<DayRow[]> {
  const { data, error } = await adminClient()
    .from("nakhonak_days")
    .select("local_date, story_id, choice, outcome, points, sent_telegram_at")
    .eq("user_id", userId)
    .order("local_date", { ascending: true });
  if (error) throw new Error(`nakhonak_days query failed: ${error.message}`);
  return (data ?? []) as DayRow[];
}

const toPlay = (r: DayRow): NakhonakPlay => ({ date: r.local_date, storyId: r.story_id, outcome: r.outcome, points: r.points });

/** The user's day as the engine sees it. Null when the user has no goals yet. */
async function contextFor(userId: string): Promise<{ ctx: NakhonakContext; rows: DayRow[] } | null> {
  const [day, rows] = await Promise.all([loadDayFor(adminClient(), userId), rowsFor(userId)]);
  if (!day) return null;
  const stats = day.stats[day.today];
  const ctx: NakhonakContext = {
    date: day.today,
    hour: hourIn(day.timezone, new Date()),
    goalKcal: day.goals.kcal,
    today: { kcal: stats?.kcal ?? 0, meals: stats?.meals ?? 0, dinnerLogged: day.items.some((i) => i.meal_type === "dinner") },
    recent: Object.entries(day.stats)
      .filter(([d]) => d !== day.today)
      .map(([date, s]) => ({ date, kcal: s.kcal, meals: s.meals })),
    plays: rows.map(toPlay),
  };
  return { ctx, rows };
}

/** Plans today, storing the story the first time (or swapping an unanswered one that no longer fits). */
async function settleToday(userId: string, ctx: NakhonakContext, rows: DayRow[]): Promise<{ plan: NakhonakPlan; row: DayRow | null }> {
  const row = rows.find((r) => r.local_date === ctx.date) ?? null;
  const existing = row ? toPlay(row) : undefined;
  if (row && !canReplan(existing, Boolean(row.sent_telegram_at))) {
    const kind = row.story_id === CHAPTER_ONE.id ? "chapter" : "story";
    return { plan: { kind, storyId: row.story_id } as NakhonakPlan, row };
  }
  const plan = planToday(ctx, existing);
  if ((plan.kind === "story" || plan.kind === "chapter") && row?.story_id !== plan.storyId) {
    const fresh: DayRow = { local_date: ctx.date, story_id: plan.storyId, choice: null, outcome: null, points: 0, sent_telegram_at: null };
    const { error } = await adminClient()
      .from("nakhonak_days")
      .upsert({ user_id: userId, local_date: ctx.date, story_id: plan.storyId }, { onConflict: "user_id,local_date" });
    if (error) throw new Error(`nakhonak_days upsert failed: ${error.message}`);
    return { plan, row: fresh };
  }
  return { plan, row };
}

function view(ctx: NakhonakContext, plan: NakhonakPlan, row: DayRow | null): AppNakhonakToday {
  const base = { date: ctx.date, intro: null, text: null, story: null, result: null, aside: null };
  if (plan.kind === "truce") return { ...base, kind: "truce", mood: "truce", text: NAKHONAK_LINES.truce[plan.holiday] };
  if (plan.kind === "paused") return { ...base, kind: "paused", mood: "gentle", text: NAKHONAK_LINES.paused };

  const answered = row?.outcome && row.choice ? answer(plan.storyId, row.choice, ctx) : null;
  const result = answered && row?.choice ? { ...answered, choice: row.choice } : null;

  if (plan.kind === "chapter") {
    return {
      ...base,
      kind: "chapter",
      mood: result ? result.mood : "gentle",
      story: { id: CHAPTER_ONE.id, title: CHAPTER_ONE.title, text: CHAPTER_ONE.text, choices: [{ id: CHAPTER_CHOICE, label: CHAPTER_ONE.button }], skipLabel: null },
      result,
    };
  }
  const story = storyById(plan.storyId)!;
  return {
    ...base,
    kind: "story",
    mood: result ? result.mood : "telling",
    intro: result ? null : introFor(ctx),
    story: { id: story.id, title: story.title, text: story.text, choices: story.choices.map((c) => ({ id: c.id, label: c.label })), skipLabel: NAKHONAK_LINES.skipLabel },
    result,
    aside: result && result.outcome !== "skip" ? weekGoodAside(ctx) : null,
  };
}

/** Today's story for a user who has ناخنک on. Null when the user has no goals. */
export async function nakhonakToday(userId: string): Promise<AppNakhonakToday | null> {
  const c = await contextFor(userId);
  if (!c) return null;
  const { plan, row } = await settleToday(userId, c.ctx, c.rows);
  return view(c.ctx, plan, row);
}

/** «من» → «پرونده‌ی ناخنک» and the today card: everything in one call. */
export async function nakhonakState(userId: string): Promise<AppNakhonak> {
  const enabled = await nakhonakEnabledFor(userId);
  const today = enabled ? await nakhonakToday(userId) : null;
  return { enabled, today, progress: progressOf((await rowsFor(userId)).map(toPlay)) };
}

export type AnswerError = "no_goals" | "not_today" | "bad_choice";

/** Records today's answer once. Answering again returns the stored result. */
export async function nakhonakAnswer(userId: string, date: string, choice: string): Promise<{ ok: true; today: AppNakhonakToday } | { ok: false; error: AnswerError }> {
  const c = await contextFor(userId);
  if (!c) return { ok: false, error: "no_goals" };
  if (date !== c.ctx.date) return { ok: false, error: "not_today" };
  const row = c.rows.find((r) => r.local_date === date);
  if (!row) return { ok: false, error: "not_today" };
  const plan: NakhonakPlan = row.story_id === CHAPTER_ONE.id ? { kind: "chapter", storyId: row.story_id } : { kind: "story", storyId: row.story_id };
  if (row.outcome) return { ok: true, today: view(c.ctx, plan, row) };
  if (row.story_id === CHAPTER_ONE.id && choice === SKIP_CHOICE) return { ok: false, error: "bad_choice" };
  const r = answer(row.story_id, choice, c.ctx);
  if (!r) return { ok: false, error: "bad_choice" };
  const { error } = await adminClient()
    .from("nakhonak_days")
    .update({ choice, outcome: r.outcome, points: r.points, answered_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("local_date", date)
    .is("outcome", null);
  if (error) throw new Error(`nakhonak_days update failed: ${error.message}`);
  const stored: DayRow = { ...row, choice, outcome: r.outcome, points: r.points };
  // The engine reads plays from the context; refresh today's entry so the day-10 line and the aside see it.
  const ctx = { ...c.ctx, plays: c.ctx.plays.map((p) => (p.date === date ? toPlay(stored) : p)) };
  return { ok: true, today: view(ctx, plan, stored) };
}

export async function markNakhonakSent(userId: string, date: string): Promise<void> {
  await adminClient().from("nakhonak_days").update({ sent_telegram_at: new Date().toISOString() }).eq("user_id", userId).eq("local_date", date);
}
