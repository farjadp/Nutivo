"use server";
import { OTP_LENGTH, otpDigits, sendErrorFa, verifyErrorFa } from "@nutivo/core";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logEvent } from "@/lib/server/log";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/shared/config";

export type AuthResult = { ok: true } | { ok: false; error: string };

const Email = z.string().trim().toLowerCase().email();

/** Emails a one-time code (and the same sign-in as a link, as a backup). */
export async function sendCodeAction(rawEmail: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "سرویس ورود هنوز راه‌اندازی نشده." };
  // A Persian keyboard turns "you@example.com" into Persian letters; say so instead of "invalid".
  if (/[؀-ۿ]/.test(rawEmail)) return { ok: false, error: "ایمیل را با کیبورد انگلیسی بنویس." };
  const email = Email.safeParse(rawEmail);
  if (!email.success) return { ok: false, error: "ایمیل معتبر نیست." };

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: true },
  });
  if (error) {
    void logEvent({ kind: "system", level: "warn", event: "auth.code_failed", actor_email: email.data, message: error.message });
    return { ok: false, error: sendErrorFa(error) };
  }
  void logEvent({ kind: "activity", event: "auth.code_sent", actor_email: email.data, meta: { channel: "web" } });
  return { ok: true };
}

/** Checks the code and signs this browser in. Redirects on success, so it only ever returns an error. */
export async function verifyCodeAction(rawEmail: string, rawCode: string): Promise<AuthResult> {
  const email = Email.safeParse(rawEmail);
  const token = otpDigits(rawCode);
  if (!email.success) return { ok: false, error: "ایمیل معتبر نیست." };
  if (token.length !== OTP_LENGTH) return { ok: false, error: "کد شش‌رقمی را کامل وارد کن." };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token, type: "email" });
  if (error) return { ok: false, error: verifyErrorFa(error) };
  // /today sends an account without goals on to onboarding.
  redirect("/today");
}

/** Ends the session in this browser only; other devices stay signed in. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
