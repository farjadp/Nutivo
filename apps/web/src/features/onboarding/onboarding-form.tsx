"use client";
import { suggestGoals } from "@nutivo/core";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { saveLocalGoals } from "@/features/local-store/day-store";
import { faInt } from "@/shared/lib/format";
import { saveProfileAction, type OnboardingState } from "./actions";

type Sex = "male" | "female";
type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
type Goal = "lose" | "maintain" | "gain";

const ACTIVITY: { v: Activity; l: string }[] = [
  { v: "sedentary", l: "کم‌تحرک" },
  { v: "light", l: "سبک" },
  { v: "moderate", l: "متوسط" },
  { v: "active", l: "فعال" },
  { v: "very_active", l: "خیلی فعال" },
];
const GOAL: { v: Goal; l: string }[] = [
  { v: "lose", l: "کاهش تدریجی" },
  { v: "maintain", l: "حفظ وزن" },
  { v: "gain", l: "افزایش" },
];

function Chips<T extends string>({ name, value, options, onChange }: { name: string; value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => (
        <label key={o.v} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors duration-150 ${value === o.v ? "border-green bg-mint font-semibold text-green-ink" : "border-line bg-surface"}`}>
          <input type="radio" name={name} value={o.v} checked={value === o.v} onChange={() => onChange(o.v)} className="sr-only" />
          {o.l}
        </label>
      ))}
    </div>
  );
}

function NumField({ id, label, unit, value, onChange, min, max }: { id: string; label: string; unit: string; value: string; onChange: (v: string) => void; min: number; max: number }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      <div className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface px-3 focus-within:border-green">
        <input id={id} name={id} inputMode="decimal" type="number" min={min} max={max} required value={value} onChange={(e) => onChange(e.target.value)} className="tabular h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        <span className="text-sm text-ink-2">{unit}</span>
      </div>
    </div>
  );
}

export function OnboardingForm({ local = false }: { local?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<OnboardingState, FormData>(saveProfileAction, {});
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("35");
  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("85");
  const [activity, setActivity] = useState<Activity>("light");
  const [goal, setGoal] = useState<Goal>("lose");
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/Toronto";

  const goals = useMemo(() => {
    const a = Number(age), h = Number(height), w = Number(weight);
    if (!(a >= 14 && h >= 120 && w >= 35)) return null;
    return suggestGoals({ sex, age: a, height_cm: h, weight_kg: w, activity, goal });
  }, [sex, age, height, weight, activity, goal]);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!local || !goals) return;
        e.preventDefault();
        saveLocalGoals(goals);
        router.push("/today");
      }}
      className="grid gap-5"
    >
      <input type="hidden" name="timezone" value={tz} />
      <div className="grid gap-2"><span className="text-sm font-semibold">جنسیت</span><Chips name="sex" value={sex} onChange={setSex} options={[{ v: "male", l: "مرد" }, { v: "female", l: "زن" }]} /></div>
      <div className="grid grid-cols-3 gap-3">
        <NumField id="age" label="سن" unit="سال" value={age} onChange={setAge} min={14} max={100} />
        <NumField id="height_cm" label="قد" unit="سانتی‌متر" value={height} onChange={setHeight} min={120} max={230} />
        <NumField id="weight_kg" label="وزن" unit="کیلو" value={weight} onChange={setWeight} min={35} max={300} />
      </div>
      <div className="grid gap-2"><span className="text-sm font-semibold">میزان فعالیت</span><Chips name="activity" value={activity} onChange={setActivity} options={ACTIVITY} /></div>
      <div className="grid gap-2"><span className="text-sm font-semibold">هدف</span><Chips name="goal" value={goal} onChange={setGoal} options={GOAL} /></div>

      {goals && (
        <section aria-label="اهداف پیشنهادی" className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <h2 className="text-base font-semibold">اهداف روزانه پیشنهادی</h2>
          <dl className="tabular mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              ["کالری", goals.kcal, "text-green-ink"],
              ["پروتئین", goals.protein_g, "text-purple-ink"],
              ["کربو", goals.carbs_g, "text-carbs"],
              ["چربی", goals.fat_g, "text-fat-ink"],
            ].map(([l, v, c]) => (
              <div key={l as string} className="grid gap-0.5">
                <dt className="text-xs text-ink-2">{l}</dt>
                <dd className={`text-lg font-bold ${c}`}>{faInt(v as number)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-6 text-ink-2">بر پایه فرمول Mifflin-St Jeor. این یک نقطه شروع است، نه توصیه پزشکی؛ بعداً از صفحه «من» قابل تغییر است.</p>
        </section>
      )}

      {state.error && <p role="alert" className="text-sm text-error">{state.error}</p>}
      <button type="submit" disabled={pending || !goals} className="h-12 rounded-[var(--radius-btn)] bg-green-ink text-[15px] font-semibold text-surface disabled:opacity-60">
        {pending ? "در حال ذخیره…" : "شروع"}
      </button>
    </form>
  );
}
