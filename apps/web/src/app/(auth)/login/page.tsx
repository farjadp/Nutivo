import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/login-form";
import { isAuthDisabled } from "@/shared/config";
import { Logo } from "@/shared/ui/logo";

export const metadata = { title: "ورود · Nutivo" };

export default function LoginPage() {
  if (isAuthDisabled()) redirect("/today");
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-8 px-4 py-10">
      <header className="grid gap-2">
        <Logo className="mb-4 h-24 justify-self-center" />
        <h1 className="text-2xl font-bold text-balance">بدانی چه خورده‌ای، انتخاب بعدی را بهتر کنی.</h1>
        <p className="text-[15px] leading-7 text-ink-2">با ایمیلت وارد شو. اطلاعات تغذیه‌ات فقط برای خودت است.</p>
      </header>
      <LoginForm />
    </main>
  );
}
