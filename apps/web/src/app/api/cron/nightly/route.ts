import { NextResponse } from "next/server";

/**
 * Vercel Cron hits this hourly. For every user whose local hour equals
 * NUTIVO_REPORT_HOUR_LOCAL, build the day's report (core.buildDailyReport)
 * and write analysis text with Claude from the computed numbers only.
 * Implemented in week 2.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, generated: 0 });
}
