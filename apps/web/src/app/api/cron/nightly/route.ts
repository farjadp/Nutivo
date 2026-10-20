import { NextResponse } from "next/server";
import type { Goals } from "@nutivo/core";
import { itemsForDate, readReport, storeReport, writeAnalysis } from "@/features/report/api/report.server";
import { itemsHash } from "@/features/report/model/hash";
import { localDate } from "@/features/today/api/load-day.server";
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
    .select("id, timezone, goal_kcal, goal_protein_g, goal_carbs_g, goal_fat_g")
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
        continue;
      }
      const goals: Goals = { kcal: Number(p.goal_kcal), protein_g: Number(p.goal_protein_g), carbs_g: Number(p.goal_carbs_g), fat_g: Number(p.goal_fat_g) };
      const r = await writeAnalysis(items, goals, date, "امروز");
      await storeReport(db, p.id, date, items, goals, r);
      void logEvent({ kind: "system", event: "ai.report", actor_id: p.id, message: `nightly ${date}`, meta: { model: r.model, ms: r.ms, ...r.usage, dropped: r.dropped.length, source: "cron" } });
      generated++;
    } catch (err) {
      failed++;
      void logEvent({ kind: "system", level: "error", event: "cron.report_failed", actor_id: p.id, message: err instanceof Error ? err.message : String(err) });
    }
  }

  void logEvent({ kind: "system", event: "cron.nightly", message: `${generated} generated, ${skipped} skipped, ${failed} failed`, meta: { due: due.length } });
  return NextResponse.json({ ok: true, due: due.length, generated, skipped, failed });
}
