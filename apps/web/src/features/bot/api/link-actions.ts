"use server";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAuthDisabled } from "@/shared/config";
import { createLinkCode } from "./service.server";

export type LinkCodeResult = { ok: true; code: string; url: string | null } | { ok: false; error: string };

/** A 15-minute code that connects the signed-in web account to a Telegram chat. */
export async function createLinkCodeAction(): Promise<LinkCodeResult> {
  if (isAuthDisabled() || !isAdminConfigured()) return { ok: false, error: "اتصال تلگرام فقط با ورود به حساب کار می‌کند." };
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return { ok: false, error: "اول وارد حساب شو." };
  const code = await createLinkCode(data.user.id);
  const bot = process.env.NUTIVO_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  return { ok: true, code, url: bot ? `https://t.me/${bot}?start=link_${code}` : null };
}
