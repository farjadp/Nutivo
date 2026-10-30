import "server-only";
import { isAdminUser } from "@/features/admin/api/guard.server";
import { adminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getSetting, SETTING_KEYS } from "@/lib/server/settings";
import { aiPrices } from "@/shared/config";
import { logEvent } from "@/lib/server/log";

/** AI calls a user triggers; their tokens are logged in activity_log.meta by each caller. */
const AI_EVENTS = ["ai.extract", "ai.ask", "ai.report"] as const;
const WINDOW_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_DAILY_CAP_USD = 0.5;

export const AI_BUDGET_REPORT_MESSAGE = "سقف استفاده‌ی روزانه از هوش مصنوعی پر شده. عددهای گزارش سر جایشان هستند؛ تحلیل چند ساعت دیگر ساخته می‌شود.";
/** Telegram has no repeats or search yet. */
export const AI_BUDGET_BOT_MESSAGE = "سقف استفاده‌ی روزانه از هوش مصنوعی پر شده. چند ساعت دیگر دوباره متن یا عکس بفرست.";
export const AI_BUDGET_MESSAGE = "سقف استفاده‌ی روزانه از هوش مصنوعی پر شده. فعلاً از «تکراری‌ها» یا جست‌وجوی غذا ثبت کن؛ چند ساعت دیگر ثبت با متن و عکس دوباره کار می‌کند.";

/** Dollar cap per user over the last 24 hours: admin panel, else NUTIVO_AI_DAILY_CAP_USD, else 0.5. 0 turns the cap off. */
export async function dailyCapUsd(): Promise<number> {
  const env = process.env.NUTIVO_AI_DAILY_CAP_USD ? Number(process.env.NUTIVO_AI_DAILY_CAP_USD) : NaN;
  const v = Number(await getSetting<number | string>(SETTING_KEYS.aiDailyCapUsd, Number.isFinite(env) && env >= 0 ? env : DEFAULT_DAILY_CAP_USD));
  return Number.isFinite(v) && v >= 0 ? v : DEFAULT_DAILY_CAP_USD;
}

/** Estimated spend from logged tokens, priced like the admin metrics page. */
export function costUsd(rows: { meta: unknown }[], price = aiPrices()): number {
  let tin = 0;
  let tout = 0;
  for (const r of rows) {
    const m = (r.meta ?? {}) as { input_tokens?: unknown; output_tokens?: unknown };
    tin += Number(m.input_tokens) || 0;
    tout += Number(m.output_tokens) || 0;
  }
  return (tin * price.input + tout * price.output) / 1_000_000;
}

export async function spentUsd(userId: string, now = new Date()): Promise<number> {
  const { data, error } = await adminClient()
    .from("activity_log")
    .select("meta")
    .eq("actor_id", userId)
    .in("event", AI_EVENTS)
    .gte("at", new Date(now.getTime() - WINDOW_MS).toISOString());
  if (error) throw new Error(error.message);
  return costUsd(data ?? []);
}

/**
 * True when this user may make another AI call. Fails open (true) when the log can't be read,
 * so a logging outage never blocks meals. Admins are never capped. Anonymous review mode has no cap.
 */
export async function withinAiBudget(userId: string | null, email: string | null = null): Promise<boolean> {
  if (!userId || !isAdminConfigured()) return true;
  try {
    const cap = await dailyCapUsd();
    if (cap === 0) return true;
    const spent = await spentUsd(userId);
    if (spent < cap) return true;
    if (!email) email = (await adminClient().auth.admin.getUserById(userId)).data.user?.email ?? null;
    if (await isAdminUser(userId, email)) return true;
    void logEvent({ kind: "system", level: "warn", event: "ai.budget_reached", actor_id: userId, message: `$${spent.toFixed(3)} of $${cap}`, meta: { spent_usd: spent, cap_usd: cap } });
    return false;
  } catch (err) {
    console.error("ai budget check failed", err);
    return true;
  }
}
