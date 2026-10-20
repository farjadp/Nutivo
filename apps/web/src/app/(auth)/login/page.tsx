import { LoginForm } from "@/features/auth/login-form";

export const metadata = { title: "ورود · Nutivo" };

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-8 px-4 py-10">
      <header className="grid gap-2">
        <p className="font-[family-name:var(--font-en)] text-sm font-semibold tracking-tight text-green-ink" dir="ltr">Nutivo</p>
        <h1 className="text-2xl font-bold text-balance">بدانی چه خورده‌ای، انتخاب بعدی را بهتر کنی.</h1>
        <p className="text-[15px] leading-7 text-ink-2">با ایمیلت وارد شو. اطلاعات تغذیه‌ات فقط برای خودت است.</p>
      </header>
      <LoginForm />
    </main>
  );
}
