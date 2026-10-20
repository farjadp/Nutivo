import type { BotResult, DayView, DraftView, Goals, ReportView, TgUser } from "@nutivo/core";

export interface ApiConfig {
  baseUrl: string;
  secret: string;
  fetch?: typeof fetch;
}

export type DraftChange = { op: "inc" | "dec" | "remove"; idx: number } | { op: "meal"; meal_type: string } | { op: "grams"; idx: number; grams: number };

export interface OnboardProfile {
  sex: "male" | "female";
  age: number;
  height_cm: number;
  weight_kg: number;
  activity: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "lose" | "maintain" | "gain";
  timezone: string;
}

/** Typed client for the web app's /api/bot/* endpoints. Never throws: network errors come back as { ok: false }. */
export function createApi(cfg: ApiConfig) {
  const f = cfg.fetch ?? fetch;
  async function call<T>(action: string, from: TgUser, chatId: number, body: Record<string, unknown> = {}): Promise<BotResult<T>> {
    try {
      const res = await f(`${cfg.baseUrl.replace(/\/$/, "")}/api/bot/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${cfg.secret}` },
        body: JSON.stringify({ from: { id: from.id, first_name: from.first_name, username: from.username, language_code: from.language_code }, chat_id: chatId, ...body }),
      });
      const json = (await res.json().catch(() => null)) as BotResult<T> | null;
      return json ?? { ok: false, error: "پاسخ سرور خوانا نبود.", code: "server" };
    } catch {
      return { ok: false, error: "به سرور Nutivo وصل نشدم. چند لحظه بعد دوباره امتحان کن.", code: "server" };
    }
  }
  return {
    hello: (u: TgUser, c: number) => call<{ linked: boolean; has_goals: boolean }>("hello", u, c),
    register: (u: TgUser, c: number) => call<{ userId: string; hasGoals: boolean }>("register", u, c),
    link: (u: TgUser, c: number, code: string) => call<{ linked: true }>("link", u, c, { code }),
    sessionGet: (u: TgUser, c: number) => call<Record<string, unknown>>("session_get", u, c),
    sessionSet: (u: TgUser, c: number, state: Record<string, unknown>) => call<{ saved: true }>("session_set", u, c, { state }),
    onboard: (u: TgUser, c: number, profile: OnboardProfile) => call<Goals>("onboard", u, c, { profile }),
    draft: (u: TgUser, c: number, body: { text?: string; photo?: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }; now: string }) =>
      call<DraftView>("draft", u, c, body),
    draftEdit: (u: TgUser, c: number, id: string, change: DraftChange) => call<DraftView>("draft_edit", u, c, { id, change }),
    draftConfirm: (u: TgUser, c: number, id: string) => call<{ entry_id: string; day: DayView | null }>("draft_confirm", u, c, { id }),
    draftCancel: (u: TgUser, c: number, id: string) => call<{ cancelled: true }>("draft_cancel", u, c, { id }),
    undo: (u: TgUser, c: number, entry_id: string) => call<{ undone: true }>("undo", u, c, { entry_id }),
    today: (u: TgUser, c: number, date?: string) => call<DayView>("today", u, c, date ? { date } : {}),
    todayCard: (u: TgUser, c: number, date?: string) => call<{ png_base64: string; day: DayView }>("today_card", u, c, date ? { date } : {}),
    report: (u: TgUser, c: number, date?: string) => call<ReportView>("report", u, c, date ? { date } : {}),
    repeat: (u: TgUser, c: number, id: string, now: string) => call<{ entry_id: string; label: string; day: DayView | null }>("repeat", u, c, { id, now }),
  };
}
export type Api = ReturnType<typeof createApi>;
