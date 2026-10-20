import type { BotResult, DayView, DraftView, Goals, ReportView } from "@nutivo/core";
import { config } from "./config";
import { supabase } from "./supabase";

export type ApiResult<T> = BotResult<T>;

export interface Me {
  email: string | null;
  has_goals: boolean;
  timezone: string;
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
async function call<T>(action: string, body: object = {}): Promise<ApiResult<T>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "دوباره وارد شو.", code: "not_linked" };
  try {
    const res = await fetch(`${config.apiUrl}/api/app/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as ApiResult<T> | null;
    return json ?? { ok: false, error: "پاسخ سرور قابل خواندن نبود.", code: "server" };
  } catch {
    return { ok: false, error: "به سرور وصل نشدیم. اینترنت را چک کن و دوباره امتحان کن.", code: "server" };
  }
}

export const api = {
  me: () => call<Me>("me"),
  onboard: (profile: ProfileInput) => call<Goals>("onboard", { profile }),
  today: (date?: string) => call<DayView>("today", { date }),
  draft: (input: { text?: string; photo?: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" } }) =>
    call<DraftView>("draft", { ...input, now: new Date().toISOString() }),
  draftEdit: (id: string, change: DraftChange) => call<DraftView>("draft_edit", { id, change }),
  draftConfirm: (id: string) => call<{ entry_id: string; day: DayView | null }>("draft_confirm", { id }),
  draftCancel: (id: string) => call<{ cancelled: true }>("draft_cancel", { id }),
  undo: (entryId: string) => call<{ undone: true }>("undo", { entry_id: entryId }),
  report: (date?: string) => call<ReportView>("report", { date }),
};
