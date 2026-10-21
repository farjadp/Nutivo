import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addRepeat,
  cancelDraft,
  confirmDraft,
  createDraft,
  createLinkCode,
  dayView,
  editDraft,
  reportFor,
  saveGoals,
  undoEntry,
  type Linked,
} from "@/features/bot/api/service.server";
import type { BotResult } from "@nutivo/core";
import { accountProfile, deleteAccountData, nutiEnabledFor, setNutiEnabled } from "@/features/account/api/account.server";
import { telegramUsername } from "@/features/bot/api/telegram.server";
import { dayDetail, deleteItem, foodUnits, itemById, updateItem } from "@/features/mobile/api/day.server";
import { logEvent } from "@/lib/server/log";
import { adminClient, isAdminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MealType = z.enum(["breakfast", "lunch", "snack", "dinner"]);
const Iso = z.string().datetime({ offset: true });
const Day = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });
const Id = z.object({ id: z.string().uuid() });

const Bodies = {
  me: z.object({}),
  onboard: z.object({
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
  draft: z.object({
    text: z.string().max(600).optional(),
    photo: z.object({ base64: z.string().max(12_000_000), mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]) }).optional(),
    now: Iso,
  }),
  draft_edit: Id.extend({
    change: z.union([
      z.object({ op: z.enum(["inc", "dec", "remove"]), idx: z.number().int().min(0).max(40) }),
      z.object({ op: z.literal("meal"), meal_type: MealType }),
      z.object({ op: z.literal("grams"), idx: z.number().int().min(0).max(40), grams: z.number().positive().max(5000) }),
    ]),
  }),
  draft_confirm: Id,
  draft_cancel: Id,
  undo: z.object({ entry_id: z.string().uuid() }),
  today: Day,
  day: Day,
  item_update: z.object({
    id: z.string().uuid(),
    change: z.union([z.object({ qty: z.number().positive().max(10000), unit: z.string().min(1).max(40) }), z.object({ grams: z.number().positive().max(5000) })]),
  }),
  item_delete: Id,
  item: Id,
  units: z.object({ food_id: z.string().min(1).max(80) }),
  repeat: z.object({ id: z.string().max(400), now: Iso }),
  report: Day,
  profile: z.object({}),
  prefs: z.object({ nuti_enabled: z.boolean() }),
  link_code: z.object({}),
  // The user types «حذف» in the app; the server checks it too so a stray request can't delete an account.
  delete_account: z.object({ confirm: z.literal("حذف") }),
} as const;
type Action = keyof typeof Bodies;

const NEEDS_GOALS = new Set<Action>(["draft", "draft_edit", "draft_confirm", "today", "day", "repeat", "report", "item_update", "item_delete"]);

interface AppUser extends Linked {
  email: string | null;
}

/** The signed-in user behind a Supabase access token from the mobile app. Null when the token is invalid or the user is blocked. */
async function appUser(req: Request): Promise<AppUser | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  const { data: p } = await adminClient().from("profiles").select("goal_kcal, timezone, status").eq("id", data.user.id).maybeSingle();
  if (p?.status === "blocked") return null;
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    hasGoals: Boolean(p?.goal_kcal),
    timezone: (p?.timezone as string) ?? "America/Toronto",
    channel: "mobile",
  };
}

/**
 * API for the Expo app (apps/mobile). Each call carries the user's own Supabase access token;
 * work runs through the same service as the Telegram bot, scoped to that one user.
 */
export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  if (!isAdminConfigured()) return NextResponse.json({ ok: false, error: "service role not configured" }, { status: 503 });
  const { action } = await ctx.params;
  if (!(action in Bodies)) return NextResponse.json({ ok: false, error: "unknown action" }, { status: 404 });
  const a = action as Action;
  const user = await appUser(req);
  if (!user) return json({ ok: false, error: "دوباره وارد شو.", code: "not_linked" }, 401);
  const parsed = Bodies[a].safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ ok: false, error: "درخواست نامعتبر است.", code: "bad_request" }, 400);
  if (NEEDS_GOALS.has(a) && !user.hasGoals) return json({ ok: false, error: "اول هدف‌هایت را تعیین کنیم.", code: "no_goals" });
  const noGoals = { ok: false, error: "اول هدف‌هایت را تعیین کنیم.", code: "no_goals" } as const;

  try {
    switch (a) {
      case "me":
        return json({
          ok: true,
          data: { email: user.email, has_goals: user.hasGoals, timezone: user.timezone, nuti_enabled: await nutiEnabledFor(user.userId) },
        });
      case "profile":
        return json({ ok: true, data: await accountProfile(user.userId, user.email) });
      case "prefs": {
        const on = (parsed.data as z.infer<(typeof Bodies)["prefs"]>).nuti_enabled;
        if (!(await setNutiEnabled(user.userId, on))) return json({ ok: false, error: "ذخیره نشد. دوباره امتحان کن.", code: "server" });
        void logEvent({ kind: "activity", event: "user.nuti_toggled", actor_id: user.userId, meta: { on, channel: "mobile" } });
        return json({ ok: true, data: { nuti_enabled: on } });
      }
      case "link_code": {
        const code = await createLinkCode(user.userId);
        const bot = await telegramUsername();
        return json({ ok: true, data: { code, url: bot ? `https://t.me/${bot}?start=link_${code}` : null } });
      }
      case "delete_account": {
        if (!(await deleteAccountData(user.userId))) return json({ ok: false, error: "حذف حساب انجام نشد. دوباره امتحان کن.", code: "server" });
        void logEvent({ kind: "activity", level: "warn", event: "user.self_deleted", actor_id: user.userId, entity: "user", entity_id: user.userId, meta: { channel: "mobile" } });
        return json({ ok: true, data: { deleted: true } });
      }
      case "onboard":
        return json(await saveGoals(user.userId, (parsed.data as z.infer<(typeof Bodies)["onboard"]>).profile));
      case "draft": {
        const b = parsed.data as z.infer<(typeof Bodies)["draft"]>;
        if (!b.text?.trim() && !b.photo) return json({ ok: false, error: "چیزی برای ثبت ننوشتی.", code: "bad_request" });
        return json(await createDraft(user, { text: b.text, photo: b.photo, nowISO: b.now }));
      }
      case "draft_edit": {
        const b = parsed.data as z.infer<(typeof Bodies)["draft_edit"]>;
        return json(await editDraft(user, b.id, b.change));
      }
      case "draft_confirm":
        return json(await confirmDraft(user, (parsed.data as z.infer<typeof Id>).id));
      case "draft_cancel":
        return json(await cancelDraft(user, (parsed.data as z.infer<typeof Id>).id));
      case "undo":
        return json(await undoEntry(user, (parsed.data as z.infer<(typeof Bodies)["undo"]>).entry_id));
      case "today": {
        const day = await dayView(user, (parsed.data as z.infer<typeof Day>).date);
        return json(day ? { ok: true, data: day } : noGoals);
      }
      case "day": {
        const d = await dayDetail(user, (parsed.data as z.infer<typeof Day>).date);
        return json(d ? { ok: true, data: d } : noGoals);
      }
      case "item_update": {
        const b = parsed.data as z.infer<(typeof Bodies)["item_update"]>;
        return json(await updateItem(user, b.id, b.change));
      }
      case "item": {
        const it = await itemById(user, (parsed.data as z.infer<typeof Id>).id);
        return json(it ? { ok: true, data: it } : { ok: false, error: "این غذا دیگر در دفترت نیست.", code: "not_found" });
      }
      case "item_delete":
        return json(await deleteItem(user, (parsed.data as z.infer<typeof Id>).id));
      case "units":
        return json({ ok: true, data: await foodUnits((parsed.data as z.infer<(typeof Bodies)["units"]>).food_id) });
      case "repeat": {
        const b = parsed.data as z.infer<(typeof Bodies)["repeat"]>;
        return json(await addRepeat(user, b.id, b.now));
      }
      case "report": {
        const r = await reportFor(user, (parsed.data as z.infer<typeof Day>).date);
        return json(r ? { ok: true, data: r } : noGoals);
      }
    }
  } catch (err) {
    void logEvent({ kind: "system", level: "error", event: "app.api_failed", actor_id: user.userId, message: `${a}: ${err instanceof Error ? err.message : String(err)}` });
    return json({ ok: false, error: "یک مشکلی پیش آمد. دوباره امتحان کن.", code: "server" }, 500);
  }
}

function json<T>(body: BotResult<T>, status = 200) {
  return NextResponse.json(body, { status });
}
