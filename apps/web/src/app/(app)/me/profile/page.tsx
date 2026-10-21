import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingForm, type ProfileInitial } from "@/features/onboarding/onboarding-form";
import { createClient } from "@/lib/supabase/server";
import { isAuthDisabled, isSupabaseConfigured } from "@/shared/config";

export const metadata = { title: "پروفایل و اهداف · Nutivo" };

/** The current profile, or null when there is none yet (then first-run onboarding is the right page). */
async function loadProfile(): Promise<ProfileInitial | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: p } = await supabase.from("profiles").select("sex, age, height_cm, weight_kg, activity, goal, goal_kcal").eq("id", auth.user.id).maybeSingle();
  if (!p?.goal_kcal || (p.sex !== "male" && p.sex !== "female")) return null;
  return {
    sex: p.sex,
    age: Number(p.age),
    height_cm: Number(p.height_cm),
    weight_kg: Number(p.weight_kg),
    activity: p.activity as ProfileInitial["activity"],
    goal: p.goal as ProfileInitial["goal"],
  };
}

/** «من › پروفایل و اهداف»: the onboarding form with the saved numbers, so editing one value keeps the rest. */
export default async function ProfilePage() {
  const local = isAuthDisabled() || !isSupabaseConfigured();
  const initial = local ? null : await loadProfile();
  if (!local && !initial) redirect("/onboarding");
  return (
    <main className="mx-auto grid max-w-md gap-6 px-4 pt-[max(20px,env(safe-area-inset-top))] pb-10">
      <header className="grid gap-1">
        <Link href="/me" className="-ms-1 flex w-fit items-center gap-0.5 py-1 text-[15px] text-green-ink hover:underline">
          <ChevronRight size={20} strokeWidth={2} aria-hidden />
          من
        </Link>
        <h1 className="text-2xl font-bold">پروفایل و اهداف</h1>
        <p className="text-[15px] leading-7 text-ink-2">با عوض کردن این‌ها، هدف‌های روزانه دوباره حساب می‌شوند.</p>
      </header>
      <OnboardingForm local={local} initial={initial ?? undefined} />
    </main>
  );
}
