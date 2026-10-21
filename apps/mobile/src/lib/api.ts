import type { AppAskOption, AppAskReply, AppDay, AppItem, AppNakhonak, AppNakhonakToday, AppProfile, BotResult, DayView, DraftView, Goals, ReportView } from "@nutivo/core";
import { config } from "./config";
import { supabase } from "./supabase";

export type ApiResult<T> = BotResult<T>;

export interface Me {
  email: string | null;
  has_goals: boolean;
  timezone: string;
  nuti_enabled: boolean;
  /** «حالت شیطان»: ناخنک, off until the user turns it on. */
  nakhonak_enabled: boolean;
}

export interface ProfileInput {
  sex: "male" | "female";
  age: number;
  height_cm: number;
  weight_kg: number;
  activity: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "lose" | "maintain" | "gain";
  timezone: string;
}

export type MealType = DraftView["meal_type"];
export type DraftChange =
  | { op: "inc" | "dec" | "remove"; idx: number }
  | { op: "meal"; meal_type: MealType }
  | { op: "grams"; idx: number; grams: number };

/** Calls the web app's /api/app/<action> with the signed-in user's access token. */
async function call<T>(action: string, body: object = {}, signal?: AbortSignal): Promise<ApiResult<T>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "دوباره وارد شو.", code: "not_linked" };
  try {
    const res = await fetch(`${config.apiUrl}/api/app/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal,
    });
    const json = (await res.json().catch(() => null)) as ApiResult<T> | null;
    return json ?? { ok: false, error: "پاسخ سرور قابل خواندن نبود.", code: "server" };
  } catch (err) {
    if (signal?.aborted) return { ok: false, error: "لغو شد.", code: "bad_request" };
    return { ok: false, error: "به سرور وصل نشدیم. اینترنت را چک کن و دوباره امتحان کن.", code: "server" };
  }
}

export const api = {
  me: () => call<Me>("me"),
  /** First run and later edits: saves the body numbers and recomputes the goals. */
  onboard: (profile: ProfileInput) => call<Goals>("onboard", { profile }),
  profile: () => call<AppProfile>("profile"),
  prefs: (p: { nuti_enabled: boolean }) => call<{ nuti_enabled: boolean }>("prefs", p),
  /** ناخنک: on/off, today's story and «پرونده‌ی ناخنک». */
  nakhonak: () => call<AppNakhonak>("nakhonak"),
  nakhonakPrefs: (on: boolean) => call<AppNakhonak>("nakhonak_prefs", { on }),
  nakhonakAnswer: (date: string, choice: string) => call<AppNakhonakToday>("nakhonak_answer", { date, choice }),
  /** One-time code (15 minutes) that connects this account to the Telegram bot. */
  linkCode: () => call<{ code: string; url: string | null }>("link_code"),
  deleteAccount: () => call<{ deleted: true }>("delete_account", { confirm: "حذف" }),
  day: (date?: string) => call<AppDay>("day", { date }),
  /** `now` defaults to this instant; pass another one to log to a past day. */
  draft: (input: { text?: string; photo?: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }; now?: string }, signal?: AbortSignal) =>
    call<DraftView>("draft", { ...input, now: input.now ?? new Date().toISOString() }, signal),
  item: (id: string) => call<AppItem>("item", { id }),
  draftEdit: (id: string, change: DraftChange) => call<DraftView>("draft_edit", { id, change }),
  draftConfirm: (id: string) => call<{ entry_id: string; day: DayView | null }>("draft_confirm", { id }),
  draftCancel: (id: string) => call<{ cancelled: true }>("draft_cancel", { id }),
  undo: (entryId: string) => call<{ undone: true }>("undo", { entry_id: entryId }),
  report: (date?: string) => call<ReportView>("report", { date }),
  itemUpdate: (id: string, change: { qty: number; unit: string } | { grams: number }) => call<{ updated: true }>("item_update", { id, change }),
  itemDelete: (id: string) => call<{ deleted: true }>("item_delete", { id }),
  units: (foodId: string) => call<string[]>("units", { food_id: foodId }),
  /** One tap: logs one of the day's repeat suggestions (`day.repeats`) again, now. */
  repeat: (id: string) => call<{ entry_id: string; label: string; day: DayView | null }>("repeat", { id, now: new Date().toISOString() }),
  /** «بپرس»: three options for what to eat next, from today's remaining budget. */
  ask: (question: string) => call<AppAskReply>("ask", { question, hour: new Date().getHours() }),
  /** «همین را خوردم» on an «بپرس» option. */
  askLog: (o: AppAskOption, mealType: MealType) =>
    call<{ entry_id: string; label: string }>("ask_log", {
      meal_type: mealType,
      label: o.name,
      items: o.items.map(({ food_id, qty, unit, grams }) => ({ food_id, qty, unit, grams })),
      now: new Date().toISOString(),
    }),
};
