import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export const metadata = { title: "پروفایل · Nutivo" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto grid max-w-md gap-6 px-4 py-8">
      <header className="grid gap-1">
        <h1 className="text-2xl font-bold">پروفایل و اهداف</h1>
        <p className="text-[15px] leading-7 text-ink-2">شصت ثانیه. با این‌ها اهداف روزانه‌ات را حساب می‌کنیم.</p>
      </header>
      <OnboardingForm />
    </main>
  );
}
