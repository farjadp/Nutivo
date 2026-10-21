import { NextResponse } from "next/server";
import type { Goals } from "@nutivo/core";
import { itemsForDate, readReport, storeReport, writeAnalysis } from "@/features/report/api/report.server";
import { itemsHash } from "@/features/report/model/hash";
import { localDate } from "@/features/today/api/load-day.server";
import { nutiEnabledFor } from "@/features/account/api/account.server";
import { dayCardSvg, renderPng } from "@/features/bot/api/card.server";
import { sendMessage, sendPhoto, telegramToken } from "@/features/bot/api/telegram.server";
import { dayView, reportFor } from "@/features/bot/api/service.server";
import { markNakhonakSent, nakhonakToday } from "@/features/nakhonak/api/nakhonak.server";
import { nakhonakTelegram } from "@/features/nakhonak/model/telegram";
import { reportCaption } from "@nutivo/core";
import { logEvent } from "@/lib/server/log";
import { adminClient, isAdminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const hourIn = (tz: string, at: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(at));

/**
 * Hourly cron. For every active user whose local hour is NUTIVO_REPORT_HOUR_LOCAL (default 21),
 * writes the day's report analysis once (skipped when an up-to-date report already exists or nothing was logged).
 * Protected by CRON_SECRET; in production the secret is required.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if ((process.env.NODE_ENV === "production" && !secret) || (secret && request.headers.get("authorization") !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdminConfigured()) return NextResponse.json({ error: "service role not configured" }, { status: 503 });

  const targetHour = Number(process.env.NUTIVO_REPORT_HOUR_LOCAL ?? 21);
  const maxPerRun = Number(process.env.NUTIVO_REPORT_MAX_PER_RUN ?? 200);
  // Development only: ?force=1 ignores the hour, ?user=<id> limits the run to one user.
  const params = new URL(request.url).searchParams;
  const dev = process.env.NODE_ENV !== "production";
  const force = dev && params.get("force") === "1";
  const onlyUser = dev ? params.get("user") : null;
  const now = new Date();
  const db = adminClient();

  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, timezone, goal_kcal, goal_protein_g, goal_carbs_g, goal_fat_g, nakhonak_enabled")
    .eq("status", "active")
    .not("goal_kcal", "is", null);
  if (error) {
    void logEvent({ kind: "system", level: "error", event: "cron.nightly_failed", message: error.message });
    return NextResponse.json({ error: "profiles query failed" }, { status: 500 });
  }

  const due = (profiles ?? []).filter((p) => (!onlyUser || p.id === onlyUser) && (force || hourIn(p.timezone ?? "America/Toronto", now) === targetHour)).slice(0, maxPerRun);
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  let pushed = 0;

  for (const p of due) {
    const tz = p.timezone ?? "America/Toronto";
    const date = localDate(now, tz);
    try {
      const items = await itemsForDate(db, p.id, tz, date);
      if (items.length === 0) {
        skipped++;
        continue;
      }
      const existing = await readReport(db, p.id, date);
      if (existing.analysis && existing.source_hash === itemsHash(items)) {
        skipped++;
        if (await pushTelegram(p.id, tz, date)) pushed++;
        continue;
      }
      const goals: Goals = { kcal: Number(p.goal_kcal), protein_g: Number(p.goal_protein_g), carbs_g: Number(p.goal_carbs_g), fat_g: Number(p.goal_fat_g) };
      const r = await writeAnalysis(items, goals, date, "امروز");
      await storeReport(db, p.id, date, items, goals, r);
      void logEvent({ kind: "system", event: "ai.report", actor_id: p.id, message: `nightly ${date}`, meta: { model: r.model, ms: r.ms, ...r.usage, dropped: r.dropped.length, source: "cron" } });
      generated++;
      if (await pushTelegram(p.id, tz, date)) pushed++;
    } catch (err) {
      failed++;
      void logEvent({ kind: "system", level: "error", event: "cron.report_failed", actor_id: p.id, message: err instanceof Error ? err.message : String(err) });
    }
  }

  // ناخنک: today's story to Telegram at NUTIVO_NAKHONAK_HOUR_LOCAL (default 20), for users who turned it on.
  const nakhonakHour = Number(process.env.NUTIVO_NAKHONAK_HOUR_LOCAL ?? 20);
  let stories = 0;
  for (const p of (profiles ?? []).filter((p) => p.nakhonak_enabled && (!onlyUser || p.id === onlyUser) && (force || hourIn(p.timezone ?? "America/Toronto", now) === nakhonakHour)).slice(0, maxPerRun)) {
    try {
      if (await pushNakhonak(p.id)) stories++;
    } catch (err) {
      void logEvent({ kind: "system", level: "error", event: "cron.nakhonak_failed", actor_id: p.id, message: err instanceof Error ? err.message : String(err) });
    }
  }

  // Housekeeping: Telegram drafts nobody confirmed, and expired link codes.
  await db.from("bot_drafts").delete().lt("expires_at", now.toISOString());
  await db.from("link_codes").delete().lt("expires_at", now.toISOString());

  void logEvent({ kind: "system", event: "cron.nightly", message: `${generated} generated, ${skipped} skipped, ${failed} failed, ${pushed} sent to Telegram, ${stories} ناخنک stories`, meta: { due: due.length } });
  return NextResponse.json({ ok: true, due: due.length, generated, skipped, failed, pushed, stories });
}

/** Sends the day card and report caption to the user's Telegram chat once per day. */
async function pushTelegram(userId: string, timezone: string, date: string): Promise<boolean> {
  if (!(await telegramToken())) return false;
  const db = adminClient();
  const { data: link } = await db.from("telegram_links").select("chat_id, notify_report").eq("user_id", userId).maybeSingle();
  if (!link?.notify_report) return false;
  const { data: row } = await db.from("daily_reports").select("sent_telegram_at").eq("user_id", userId).eq("date", date).maybeSingle();
  if (row?.sent_telegram_at) return false;
  const user = { userId, hasGoals: true, timezone };
  const [report, day, nuti] = await Promise.all([reportFor(user, date, { write: false }), dayView(user, date), nutiEnabledFor(userId)]);
  if (!report || !day) return false;
  const res = await sendPhoto(Number(link.chat_id), renderPng(dayCardSvg(day, { nuti })), reportCaption(report), {
    inline_keyboard: [[{ text: "گزارش کامل", callback_data: `rpt:${date}` }]],
  });
  if (!res.ok) {
    void logEvent({ kind: "system", level: "warn", event: "bot.push_failed", actor_id: userId, message: res.description ?? "unknown" });
    return false;
  }
  await db.from("daily_reports").update({ sent_telegram_at: new Date().toISOString() }).eq("user_id", userId).eq("date", date);
  void logEvent({ kind: "activity", event: "bot.report_sent", actor_id: userId, message: date });
  return true;
}

/** Sends today's ناخنک story once, unless it was already answered in the app or sent before. */
async function pushNakhonak(userId: string): Promise<boolean> {
  if (!(await telegramToken())) return false;
  const db = adminClient();
  const { data: link } = await db.from("telegram_links").select("chat_id").eq("user_id", userId).maybeSingle();
  if (!link) return false;
  const today = await nakhonakToday(userId);
  if (!today || today.kind !== "story" || today.result) return false;
  const { data: row } = await db.from("nakhonak_days").select("sent_telegram_at").eq("user_id", userId).eq("local_date", today.date).maybeSingle();
  if (row?.sent_telegram_at) return false;
  const msg = nakhonakTelegram(today);
  const res = await sendMessage(Number(link.chat_id), msg.text, msg.keyboard ? { inline_keyboard: msg.keyboard } : undefined);
  if (!res.ok) {
    void logEvent({ kind: "system", level: "warn", event: "bot.nakhonak_failed", actor_id: userId, message: res.description ?? "unknown" });
    return false;
  }
  await markNakhonakSent(userId, today.date);
  return true;
}
