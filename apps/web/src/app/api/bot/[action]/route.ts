import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addRepeat,
  cancelDraft,
  confirmDraft,
  createDraft,
  dayCard,
  dayView,
  reportFor,
  editDraft,
  getSession,
  linkedUser,
  redeemLinkCode,
  register,
  saveGoals,
  setSession,
  undoEntry,
  type Linked,
} from "@/features/bot/api/service.server";
import type { BotResult } from "@nutivo/core";
import { logEvent } from "@/lib/server/log";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { botSecret } from "@/shared/config";
import { telegramToken, telegramUsername } from "@/features/bot/api/telegram.server";
import { nakhonakAnswer, nakhonakEnabledFor, nakhonakToday, setNakhonakEnabled } from "@/features/nakhonak/api/nakhonak.server";
import { nakhonakTelegram } from "@/features/nakhonak/model/telegram";
import { NAKHONAK_LINES } from "@nutivo/core";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const From = z.object({ id: z.number().int().positive(), first_name: z.string().max(100).optional(), username: z.string().max(64).optional(), language_code: z.string().max(10).optional() });
const Base = z.object({ from: From, chat_id: z.number().int() });
const MealType = z.enum(["breakfast", "lunch", "snack", "dinner"]);
const Iso = z.string().datetime({ offset: true });

const Bodies = {
  hello: Base,
  register: Base,
  link: Base.extend({ code: z.string().min(4).max(12) }),
  session_get: Base,
  session_set: Base.extend({ state: z.record(z.unknown()) }),
  onboard: Base.extend({
    profile: z.object({
      sex: z.enum(["male", "female"]),
      age: z.number().int().min(14).max(100),
      height_cm: z.number().min(120).max(230),
      weight_kg: z.number().min(35).max(300),
      activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
      goal: z.enum(["lose", "maintain", "gain"]),
      timezone: z.string().min(1).max(64),
    }),
  }),
  draft: Base.extend({
    text: z.string().max(600).optional(),
    photo: z.object({ base64: z.string().max(12_000_000), mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]) }).optional(),
    now: Iso,
  }),
  draft_edit: Base.extend({
    id: z.string().uuid(),
    change: z.union([
      z.object({ op: z.enum(["inc", "dec", "remove"]), idx: z.number().int().min(0).max(40) }),
      z.object({ op: z.literal("meal"), meal_type: MealType }),
      z.object({ op: z.literal("grams"), idx: z.number().int().min(0).max(40), grams: z.number().positive().max(5000) }),
    ]),
  }),
  draft_confirm: Base.extend({ id: z.string().uuid() }),
  draft_cancel: Base.extend({ id: z.string().uuid() }),
  undo: Base.extend({ entry_id: z.string().uuid() }),
  today: Base.extend({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  repeat: Base.extend({ id: z.string().max(400), now: Iso }),
  today_card: Base.extend({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  report: Base.extend({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  nakhonak_today: Base,
  nakhonak_toggle: Base.extend({ on: z.boolean() }),
  nakhonak_answer: Base.extend({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), choice: z.string().min(1).max(4) }),
} as const;
type Action = keyof typeof Bodies;

function authorized(req: Request): boolean {
  const secret = botSecret();
  const got = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || got.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

const NEEDS_USER = new Set<Action>(["draft", "draft_edit", "draft_confirm", "draft_cancel", "undo", "today", "repeat", "onboard", "today_card", "report", "nakhonak_today", "nakhonak_toggle", "nakhonak_answer"]);
const NEEDS_GOALS = new Set<Action>(["draft", "draft_edit", "draft_confirm", "today", "repeat", "today_card", "report", "nakhonak_today", "nakhonak_toggle", "nakhonak_answer"]);

/**
 * Internal API for the Telegram bot (apps/bot). Not for browsers: requires the shared NUTIVO_BOT_SECRET.
 * Runs with the service role, so every call is resolved to one user and scoped to that user's rows.
 */
export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!isAdminConfigured()) return NextResponse.json({ ok: false, error: "service role not configured" }, { status: 503 });
  const { action } = await ctx.params;
  // The bot process asks for its Telegram token at startup (set in the admin panel, else env).
  if (action === "config") {
    const token = await telegramToken();
    return token
      ? NextResponse.json({ ok: true, data: { token, username: await telegramUsername() } })
      : NextResponse.json({ ok: false, error: "توکن تلگرام در پنل ادمین (تنظیمات) ثبت نشده.", code: "not_found" }, { status: 404 });
  }
  if (!(action in Bodies)) return NextResponse.json({ ok: false, error: "unknown action" }, { status: 404 });
  const a = action as Action;
  const parsed = Bodies[a].safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad request", code: "bad_request" }, { status: 400 });
  const b = parsed.data as z.infer<(typeof Bodies)["draft"]> & Record<string, unknown>;

  try {
    let user: Linked | null = null;
    if (a !== "register" && a !== "link") user = await linkedUser(b.from, b.chat_id);
    if (NEEDS_USER.has(a) && !user) return json({ ok: false, error: "اول /start را بزن.", code: "not_linked" });
    if (NEEDS_GOALS.has(a) && !user!.hasGoals) return json({ ok: false, error: "اول هدف‌هایت را تعیین کنیم.", code: "no_goals" });

    switch (a) {
      case "hello":
        return json({ ok: true, data: { linked: Boolean(user), has_goals: user?.hasGoals ?? false } });
      case "register":
        return json(await register(b.from, b.chat_id));
      case "link":
        return json(await redeemLinkCode(b.from, b.chat_id, String(b.code)));
      case "session_get":
        return json({ ok: true, data: await getSession(b.from.id) });
      case "session_set":
        await setSession(b.from.id, b.state as Record<string, unknown>);
        return json({ ok: true, data: { saved: true } });
      case "onboard":
        return json(await saveGoals(user!.userId, (parsed.data as z.infer<(typeof Bodies)["onboard"]>).profile));
      case "draft":
        if (!b.text?.trim() && !b.photo) return json({ ok: false, error: "چیزی برای ثبت نفرستادی.", code: "bad_request" });
        return json(await createDraft(user!, { text: b.text, photo: b.photo, nowISO: b.now }));
      case "draft_edit": {
        const d = parsed.data as z.infer<(typeof Bodies)["draft_edit"]>;
        return json(await editDraft(user!, d.id, d.change));
      }
      case "draft_confirm":
        return json(await confirmDraft(user!, String(b.id)));
      case "draft_cancel":
        return json(await cancelDraft(user!, String(b.id)));
      case "undo":
        return json(await undoEntry(user!, String(b.entry_id)));
      case "today": {
        const day = await dayView(user!, b.date as string | undefined);
        return json(day ? { ok: true, data: day } : { ok: false, error: "اول هدف‌هایت را تعیین کنیم.", code: "no_goals" });
      }
      case "repeat":
        return json(await addRepeat(user!, String(b.id), b.now));
      case "today_card": {
        const card = await dayCard(user!, b.date as string | undefined);
        return json(card ? { ok: true, data: { png_base64: card.png.toString("base64"), day: card.day } } : { ok: false, error: "اول هدف‌هایت را تعیین کنیم.", code: "no_goals" });
      }
      case "report": {
        const r = await reportFor(user!, b.date as string | undefined);
        return json(r ? { ok: true, data: r } : { ok: false, error: "اول هدف‌هایت را تعیین کنیم.", code: "no_goals" });
      }
      // ناخنک: off → an invitation with an «on» button; on → today's story or its result.
      case "nakhonak_today": {
        if (!(await nakhonakEnabledFor(user!.userId))) {
          return json({ ok: true, data: { enabled: false, text: `<b>ناخنک</b>\n\n${NAKHONAK_LINES.intro}`, keyboard: [[{ text: "روشنش کن", callback_data: "nko:on" }]] } });
        }
        const t = await nakhonakToday(user!.userId);
        return json(t ? { ok: true, data: { enabled: true, ...nakhonakTelegram(t) } } : { ok: false, error: "اول هدف‌هایت را تعیین کنیم.", code: "no_goals" });
      }
      case "nakhonak_toggle": {
        const on = Boolean(b.on);
        if (!(await setNakhonakEnabled(user!.userId, on))) return json({ ok: false, error: "ذخیره نشد. دوباره امتحان کن.", code: "server" });
        void logEvent({ kind: "activity", event: "user.nakhonak_toggled", actor_id: user!.userId, meta: { on, channel: "telegram" } });
        if (!on) return json({ ok: true, data: { enabled: false, text: `<b>ناخنک</b>\n\n${NAKHONAK_LINES.disabled}`, keyboard: null } });
        const t = await nakhonakToday(user!.userId);
        const msg = t ? nakhonakTelegram(t) : { text: "", keyboard: null };
        return json({ ok: true, data: { enabled: true, text: `<b>ناخنک</b>\n\n${NAKHONAK_LINES.enabled}\n\n${msg.text}`, keyboard: msg.keyboard } });
      }
      case "nakhonak_answer": {
        const r = await nakhonakAnswer(user!.userId, String(b.date), String(b.choice));
        if (!r.ok) return json({ ok: false, error: r.error === "not_today" ? "قصه‌ی این روز تموم شده." : "این گزینه رو نمی‌شناسم.", code: "bad_request" });
        void logEvent({ kind: "activity", event: "nakhonak.answered", actor_id: user!.userId, meta: { outcome: r.today.result?.outcome, story: r.today.story?.id, channel: "telegram" } });
        return json({ ok: true, data: nakhonakTelegram(r.today) });
      }
    }
  } catch (err) {
    void logEvent({ kind: "system", level: "error", event: "bot.api_failed", message: `${a}: ${err instanceof Error ? err.message : String(err)}` });
    return json({ ok: false, error: "یک مشکلی پیش آمد. دوباره امتحان کن.", code: "server" }, 500);
  }
}

function json<T>(body: BotResult<T>, status = 200) {
  return NextResponse.json(body, { status });
}
