"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/shared/config";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

export async function sendMagicLinkAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) return { status: "error", message: "سرویس ورود هنوز راه‌اندازی نشده." };
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { status: "error", message: "ایمیل معتبر نیست." };

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: true },
  });
  if (error) return { status: "error", message: "ارسال لینک انجام نشد. چند دقیقه بعد دوباره امتحان کن.", email: email.data };
  return { status: "sent", email: email.data };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
