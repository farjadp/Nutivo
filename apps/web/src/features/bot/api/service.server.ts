import "server-only";
import { randomUUID } from "node:crypto";
import {
  macrosForGrams,
  roundMacro,
  streakStatus,
  suggestGoals,
  sumMacros,
  type Food,
  type Goals,
  type MealType,
  type PortionUnit,
} from "@nutivo/core";
import { ExtractError, extractMeal } from "@/features/log-meal/api/extract.server";
import { resolveMeal } from "@/features/log-meal/api/resolve.server";
import { saveMeal } from "@/features/log-meal/api/save.server";
import type { DraftItem } from "@/features/log-meal/model/draft";
import { regram } from "@/features/log-meal/model/recalc";
import { statsComplete } from "@/features/today/model/day";
import { repeatLabel } from "@/features/today/model/repeats";
import { loadDayFor } from "@/features/today/api/load-day.server";
import { readReport, storeReport, writeAnalysis } from "@/features/report/api/report.server";
import { itemsHash } from "@/features/report/model/hash";
import { buildDailyReport, reportFacts, type ReportView } from "@nutivo/core";
import { faDayWord } from "@/shared/lib/format";
import { nutiEnabledFor } from "@/features/account/api/account.server";
import { logEvent } from "@/lib/server/log";
import { dayCardSvg, renderPng } from "./card.server";
import { adminClient } from "@/lib/supabase/admin";
import type { BotResult, DayView, DraftView, TgUser } from "@nutivo/core";

/** What the bot keeps between "here is your meal" and "ثبت". */
interface StoredDraft {
  raw_input: string;
  from_photo: boolean;
  photo_path: string | null;
  eaten_at: string;
  items: DraftItem[];
  foods: Record<string, Food>;
  units: Record<string, PortionUnit[]>;
  question: string | null;
}

const db = () => adminClient();
const fail = <T>(error: string, code: NonNullable<Extract<BotResult<T>, { ok: false }>["code"]>): BotResult<T> => ({ ok: false, error, code });

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export interface Linked {
  userId: string;
  hasGoals: boolean;
  timezone: string;
  /** Where the call comes from; the mobile app reuses this service. Default: telegram. */
  channel?: "telegram" | "mobile";
}

const channelOf = (user: Linked) => user.channel ?? "telegram";

/** The Nutivo account behind a Telegram user, refreshing chat and name. Null when not linked yet. */
export async function linkedUser(from: TgUser, chatId: number): Promise<Linked | null> {
  const { data } = await db().from("telegram_links").select("user_id").eq("telegram_id", from.id).maybeSingle();
  if (!data) return null;
  await db()
    .from("telegram_links")
    .update({ chat_id: chatId, username: from.username ?? null, first_name: from.first_name ?? null, language: from.language_code ?? null, last_seen_at: new Date().toISOString() })
    .eq("telegram_id", from.id);
  const { data: p } = await db().from("profiles").select("goal_kcal, timezone, status").eq("id", data.user_id).maybeSingle();
  if (p?.status === "blocked") return null;
  return { userId: data.user_id as string, hasGoals: Boolean(p?.goal_kcal), timezone: (p?.timezone as string) ?? "America/Toronto" };
}

/** Creates a Telegram-only account (no email login) and links it. Idempotent. */
export async function register(from: TgUser, chatId: number): Promise<BotResult<Linked>> {
  const existing = await linkedUser(from, chatId);
  if (existing) return { ok: true, data: existing };
  const email = `tg-${from.id}@telegram.invalid`;
  const created = await db().auth.admin.createUser({ email, email_confirm: true, user_metadata: { telegram_id: from.id, source: "telegram" } });
  let userId = created.data.user?.id;
  if (!userId) {
    // Account exists from an earlier, half-finished /start: find it by email.
    const { data: list } = await db().auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = list?.users.find((u) => u.email === email)?.id;
  }
  if (!userId) return fail("ساخت حساب انجام نشد. چند لحظه بعد دوباره /start را بزن.", "server");
  const { error } = await db()
    .from("telegram_links")
    .upsert({ telegram_id: from.id, user_id: userId, chat_id: chatId, username: from.username ?? null, first_name: from.first_name ?? null, language: from.language_code ?? null });
  if (error) return fail("اتصال حساب انجام نشد.", "server");
  void logEvent({ kind: "activity", event: "bot.registered", actor_id: userId, message: from.username ? `@${from.username}` : String(from.id) });
  return { ok: true, data: { userId, hasGoals: false, timezone: "America/Toronto" } };
}

/** Moves this Telegram chat onto an existing web account using a one-time code from the «من» page. */
export async function redeemLinkCode(from: TgUser, chatId: number, code: string): Promise<BotResult<{ linked: true }>> {
  const clean = code.trim().toUpperCase();
  const { data } = await db().from("link_codes").select("user_id, expires_at").eq("code", clean).maybeSingle();
  if (!data || new Date(data.expires_at as string) < new Date()) return fail("این کد معتبر نیست یا منقضی شده. از صفحه «من» کد تازه بگیر.", "not_found");
  await db().from("link_codes").delete().eq("code", clean);
  const { error } = await db()
    .from("telegram_links")
    .upsert({ telegram_id: from.id, user_id: data.user_id, chat_id: chatId, username: from.username ?? null, first_name: from.first_name ?? null }, { onConflict: "telegram_id" });
  if (error) return fail("این حساب به تلگرام دیگری وصل است.", "bad_request");
  void logEvent({ kind: "activity", event: "bot.linked", actor_id: data.user_id as string });
  return { ok: true, data: { linked: true } };
}

/** One-time code for linking, created by a signed-in web user. */
export async function createLinkCode(userId: string): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => alphabet[b % alphabet.length]).join("");
  await db().from("link_codes").delete().eq("user_id", userId);
  await db().from("link_codes").insert({ code, user_id: userId });
  return code;
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export interface OnboardInput {
  sex: "male" | "female";
  age: number;
  height_cm: number;
  weight_kg: number;
  activity: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "lose" | "maintain" | "gain";
  timezone: string;
}

export async function saveGoals(userId: string, p: OnboardInput): Promise<BotResult<Goals>> {
  const g = suggestGoals(p);
  const { error } = await db()
    .from("profiles")
    .upsert({ id: userId, ...p, goal_kcal: g.kcal, goal_protein_g: g.protein_g, goal_carbs_g: g.carbs_g, goal_fat_g: g.fat_g });
  if (error) return fail("ذخیره هدف‌ها انجام نشد.", "server");
  void logEvent({ kind: "activity", event: "bot.onboarded", actor_id: userId, meta: { goal: p.goal, goal_kcal: g.kcal } });
  return { ok: true, data: g };
}

export async function getSession(telegramId: number): Promise<Record<string, unknown>> {
  const { data } = await db().from("bot_sessions").select("state").eq("telegram_id", telegramId).maybeSingle();
  return (data?.state as Record<string, unknown>) ?? {};
}

export async function setSession(telegramId: number, state: Record<string, unknown>) {
  await db().from("bot_sessions").upsert({ telegram_id: telegramId, state, updated_at: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

function view(id: string, meal_type: MealType, d: StoredDraft): DraftView {
  const items = d.items.map((it, idx) => {
    const food = it.food_id ? d.foods[it.food_id] : undefined;
    const m = food && it.grams ? roundMacro(macrosForGrams(food, it.grams)) : null;
    return {
      idx,
      said: it.name_raw,
      food: food?.name_fa ?? null,
      qty: it.qty,
      unit: it.unit,
      grams: it.grams,
      kcal: m?.kcal ?? null,
      protein_g: m?.protein_g ?? null,
      estimated: it.is_estimated,
      question: it.question ?? null,
    };
  });
  const totals = roundMacro(sumMacros(d.items.flatMap((it) => (it.food_id && it.grams ? [macrosForGrams(d.foods[it.food_id]!, it.grams)] : []))));
  return {
    id,
    meal_type,
    items,
    totals,
    estimated: d.items.some((i) => i.is_estimated),
    ready: d.items.length > 0 && d.items.every((i) => i.food_id && i.grams && i.grams > 0),
    question: d.question ?? d.items.find((i) => i.question)?.question ?? null,
    from_photo: d.from_photo,
  };
}

async function loadDraft(userId: string, id: string) {
  const { data } = await db().from("bot_drafts").select("draft, meal_type, expires_at").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data || new Date(data.expires_at as string) < new Date()) return null;
  return { draft: data.draft as StoredDraft, meal_type: data.meal_type as MealType };
}

/** «2026-10-20T13:05:00-04:00»: the instant in the user's own timezone, so the model infers the right meal. */
export function isoInTz(at: Date, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "longOffset" })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const off = parts.timeZoneName === "GMT" ? "+00:00" : String(parts.timeZoneName).replace("GMT", "");
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${off}`;
}

export async function createDraft(
  user: Linked,
  input: { text?: string; photo?: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }; nowISO: string },
): Promise<BotResult<DraftView>> {
  const text = (input.text ?? "").slice(0, 600);
  input = { ...input, nowISO: isoInTz(new Date(input.nowISO), user.timezone) };
  try {
    let photo_path: string | null = null;
    if (input.photo) {
      const bytes = Buffer.from(input.photo.base64, "base64");
      if (bytes.length > 8 * 1024 * 1024) return fail("عکس بزرگ‌تر از ۸ مگابایت است.", "bad_request");
      photo_path = `${user.userId}/${input.nowISO.slice(0, 10)}/${randomUUID()}.${input.photo.mediaType.split("/")[1]}`;
      const up = await db().storage.from("meal-photos").upload(photo_path, bytes, { contentType: input.photo.mediaType, upsert: false });
      if (up.error) photo_path = null; // the meal still logs without the stored photo
    }
    const ex = await extractMeal({ text, image: input.photo, nowISO: input.nowISO });
    const r = await resolveMeal(db(), ex.meal);
    void logEvent({
      kind: "system",
      event: "ai.extract",
      actor_id: user.userId,
      message: `${channelOf(user)} ${input.photo ? "photo" : "text"} → ${ex.meal.items.length} items`,
      meta: { model: ex.model, ms: ex.ms, ...ex.usage, input: input.photo ? "photo" : "text", channel: channelOf(user), items: ex.meal.items.length, unmatched: r.items.filter((i) => !i.food_id).length },
    });
    const stored: StoredDraft = {
      raw_input: text,
      from_photo: Boolean(input.photo),
      photo_path,
      eaten_at: ex.meal.eaten_at ?? input.nowISO,
      items: r.items,
      foods: r.foods,
      units: r.units,
      question: r.items.find((i) => i.question)?.question ?? null,
    };
    const { data, error } = await db().from("bot_drafts").insert({ user_id: user.userId, draft: stored, meal_type: ex.meal.meal_type }).select("id").single();
    if (error || !data) return fail("ذخیره پیش‌نویس انجام نشد.", "server");
    return { ok: true, data: view(data.id as string, ex.meal.meal_type, stored) };
  } catch (err) {
    void logEvent({ kind: "system", level: err instanceof ExtractError ? "warn" : "error", event: "ai.extract_failed", actor_id: user.userId, message: err instanceof Error ? err.message : String(err), meta: { channel: channelOf(user) } });
    return fail(err instanceof ExtractError ? err.userMessage : "یک مشکلی پیش آمد. دوباره بفرست.", "server");
  }
}

export type DraftOp = { op: "inc" | "dec" | "remove"; idx: number } | { op: "meal"; meal_type: MealType } | { op: "grams"; idx: number; grams: number };

export async function editDraft(user: Linked, id: string, change: DraftOp): Promise<BotResult<DraftView>> {
  const found = await loadDraft(user.userId, id);
  if (!found) return fail("این پیش‌نویس منقضی شده. دوباره بفرست.", "not_found");
  const d = found.draft;
  let meal_type = found.meal_type;
  if (change.op === "meal") meal_type = change.meal_type;
  else {
    const it = d.items[change.idx];
    if (!it) return fail("این آیتم پیدا نشد.", "bad_request");
    if (change.op === "remove") d.items.splice(change.idx, 1);
    else if (change.op === "grams") d.items[change.idx] = { ...it, grams: Math.round(change.grams), question: undefined };
    else {
      const step = it.unit === "گرم" ? 25 : it.qty >= 1 ? 1 : 0.5;
      const qty = Math.max(change.op === "dec" ? (it.unit === "گرم" ? 25 : 0.5) : 0, +(it.qty + (change.op === "inc" ? step : -step)).toFixed(2));
      const next = { ...it, qty };
      const food = next.food_id ? d.foods[next.food_id] : undefined;
      d.items[change.idx] = { ...next, ...regram(next, food, next.food_id ? d.units[next.food_id] ?? [] : []) };
    }
  }
  await db().from("bot_drafts").update({ draft: d, meal_type }).eq("id", id).eq("user_id", user.userId);
  return { ok: true, data: view(id, meal_type, d) };
}

export async function confirmDraft(user: Linked, id: string): Promise<BotResult<{ entry_id: string; day: DayView | null }>> {
  const found = await loadDraft(user.userId, id);
  if (!found) return fail("این پیش‌نویس منقضی شده. دوباره بفرست.", "not_found");
  const d = found.draft;
  const v = view(id, found.meal_type, d);
  if (!v.ready) return fail("اول وزن آیتم‌های علامت‌دار را مشخص کن.", "bad_request");
  const { data: auth } = await db().auth.admin.getUserById(user.userId);
  const res = await saveMeal(db(), { id: user.userId, email: auth.user?.email ?? null }, {
    meal_type: found.meal_type,
    raw_input: d.raw_input || (d.from_photo ? (channelOf(user) === "mobile" ? "عکس از اپ" : "عکس از تلگرام") : ""),
    input_channel: channelOf(user),
    photo_path: d.photo_path,
    eaten_at: d.eaten_at,
    items: d.items.map((i) => ({ food_id: i.food_id!, name_raw: i.name_raw, qty: i.qty, unit: i.unit, grams: i.grams!, is_estimated: i.is_estimated, confidence: i.confidence })),
  });
  if (!res.ok) return res;
  await db().from("bot_drafts").delete().eq("id", id).eq("user_id", user.userId);
  return { ok: true, data: { entry_id: res.entry_id, day: await dayView(user) } };
}

export async function cancelDraft(user: Linked, id: string): Promise<BotResult<{ cancelled: true }>> {
  const found = await loadDraft(user.userId, id);
  if (found?.draft.photo_path) await db().storage.from("meal-photos").remove([found.draft.photo_path]);
  await db().from("bot_drafts").delete().eq("id", id).eq("user_id", user.userId);
  return { ok: true, data: { cancelled: true } };
}

/** Undo a saved meal (the «برگردان» button under the confirmation). */
export async function undoEntry(user: Linked, entryId: string): Promise<BotResult<{ undone: true }>> {
  const { data } = await db().from("meal_entries").delete().eq("id", entryId).eq("user_id", user.userId).select("id");
  if (!data?.length) return fail("این وعده دیگر قابل برگرداندن نیست.", "not_found");
  void logEvent({ kind: "activity", event: "meal.entry_undone", actor_id: user.userId, entity: "meal_entry", entity_id: entryId, meta: { channel: channelOf(user) } });
  return { ok: true, data: { undone: true } };
}

// ---------------------------------------------------------------------------
// Day summary
// ---------------------------------------------------------------------------

export async function dayView(user: Linked, date?: string): Promise<DayView | null> {
  const day = await loadDayFor(db(), user.userId, date);
  if (!day) return null;
  const m = sumMacros(day.items.map((i) => i.macros));
  const logDates = day.items.length ? [...day.pastLogDates, day.today] : day.pastLogDates;
  const order: MealType[] = ["breakfast", "lunch", "snack", "dinner"];
  return {
    date: day.date,
    today: day.today,
    goals: day.goals,
    totals: roundMacro(m),
    remaining: { kcal: Math.round(day.goals.kcal - m.kcal), protein_g: Math.round(day.goals.protein_g - m.protein_g) },
    meals: order
      .map((mt) => {
        const list = day.items.filter((i) => i.meal_type === mt);
        return { meal_type: mt, kcal: Math.round(sumMacros(list.map((i) => i.macros)).kcal), items: list.map((i) => ({ name: i.food.name_fa, kcal: Math.round(i.macros.kcal), estimated: i.is_estimated })) };
      })
      .filter((x) => x.items.length),
    streak: streakStatus({ logDates, today: day.today, graceDaysPerWeek: 1 }).current,
    complete: statsComplete({ kcal: m.kcal, protein_g: m.protein_g, meals: new Set(day.items.map((i) => i.meal_type)).size }, day.goals),
    repeats: day.repeats.slice(0, 4).map((r) => ({ id: r.id, label: repeatLabel(r), meal_type: r.meal_type })),
  };
}

/** One-tap repeat from the user's own history. */
export async function addRepeat(user: Linked, repeatId: string, nowUtc: string): Promise<BotResult<{ entry_id: string; label: string; day: DayView | null }>> {
  const day = await loadDayFor(db(), user.userId);
  const r = day?.repeats.find((x) => x.id === repeatId);
  if (!r) return fail("این وعده دیگر در پیشنهادها نیست.", "not_found");
  const { data: auth } = await db().auth.admin.getUserById(user.userId);
  const res = await saveMeal(db(), { id: user.userId, email: auth.user?.email ?? null }, {
    meal_type: r.meal_type,
    raw_input: repeatLabel(r),
    input_channel: channelOf(user),
    photo_path: null,
    eaten_at: isoInTz(new Date(nowUtc), user.timezone),
    items: r.items.map((i) => ({ food_id: i.food.id, name_raw: i.name_raw, qty: i.qty, unit: i.unit, grams: i.grams, is_estimated: i.is_estimated, confidence: i.confidence })),
  });
  if (!res.ok) return res;
  return { ok: true, data: { entry_id: res.entry_id, label: repeatLabel(r), day: await dayView(user) } };
}

// ---------------------------------------------------------------------------
// Card and report
// ---------------------------------------------------------------------------

/** The «امروز» PNG card plus the numbers behind it. */
export async function dayCard(user: Linked, date?: string): Promise<{ png: Buffer; day: DayView } | null> {
  const [day, nuti] = await Promise.all([dayView(user, date), nutiEnabledFor(user.userId)]);
  if (!day) return null;
  return { png: renderPng(dayCardSvg(day, { nuti })), day };
}

/**
 * The day's report. Uses the stored analysis when it matches the day's items; otherwise writes a new one
 * (only when something was logged, so empty days cost nothing).
 */
export async function reportFor(user: Linked, date?: string, opts: { write?: boolean } = {}): Promise<ReportView | null> {
  const day = await loadDayFor(db(), user.userId, date);
  if (!day) return null;
  const report = buildDailyReport({ date: day.date, items: day.items, goals: day.goals });
  const facts = reportFacts(report, day.goals);
  let stored = await readReport(db(), user.userId, day.date);
  const fresh = stored.analysis && stored.source_hash === itemsHash(day.items);
  if (!fresh && day.items.length && opts.write !== false) {
    const r = await writeAnalysis(day.items, day.goals, day.date, faDayWord(day.date, day.today));
    await storeReport(db(), user.userId, day.date, day.items, day.goals, r);
    void logEvent({ kind: "system", event: "ai.report", actor_id: user.userId, message: `${channelOf(user)} ${day.date}`, meta: { model: r.model, ms: r.ms, ...r.usage, dropped: r.dropped.length, channel: channelOf(user) } });
    stored = { analysis: r.analysis, source_hash: itemsHash(day.items), generated_at: new Date().toISOString() };
  }
  return { date: day.date, day_label: faDayWord(day.date, day.today), facts, analysis: fresh || day.items.length ? stored.analysis : null };
}
