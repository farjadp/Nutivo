import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PasswordForm } from "@/features/auth/password-form";
import { createClient } from "@/lib/supabase/server";
import { isAuthDisabled, isSupabaseConfigured } from "@/shared/config";

export const metadata = { title: "رمز عبور · Nutivo" };

/** «من › رمز عبور»: optional password for signing in without waiting for a code. */
export default async function PasswordPage() {
  if (isAuthDisabled() || !isSupabaseConfigured()) redirect("/me");
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) redirect("/login");
  const has = data.user.user_metadata?.has_password === true;
  return (
    <main className="mx-auto grid max-w-md gap-6 px-4 pt-[max(20px,env(safe-area-inset-top))] pb-10">
      <header className="grid gap-1">
        <Link href="/me" className="-ms-1 flex w-fit items-center gap-0.5 py-1 text-[15px] text-green-ink hover:underline">
          <ChevronRight size={20} strokeWidth={2} aria-hidden />
          من
        </Link>
        <h1 className="text-2xl font-bold">{has ? "عوض کردن رمز" : "گذاشتن رمز"}</h1>
        <p className="text-[15px] leading-7 text-ink-2">اختیاری است. با رمز، دفعه بعد بدون منتظر ماندن برای ایمیل وارد می‌شوی. اگر رمز را فراموش کنی، با کد وارد شو و از همین‌جا رمز تازه بگذار.</p>
      </header>
      <PasswordForm />
    </main>
  );
}
