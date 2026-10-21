"use client";
import { suggestGoals, toLatinDigits, toPersianDigits, type Goals, type NutiMood } from "@nutivo/core";
import { Bike, ChevronRight, Dumbbell, Flame, Footprints, Mars, Minus, Plus, Scale, Sofa, TrendingDown, TrendingUp, Venus, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { saveLocalGoals } from "@/features/local-store/day-store";
import { Nuti } from "@/features/mascot/ui/nuti";
import { faInt } from "@/shared/lib/format";
import { saveProfileAction, type OnboardingState } from "./actions";

type Sex = "male" | "female";
type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
type Goal = "lose" | "maintain" | "gain";

interface Choice<T> {
  v: T;
  l: string;
  hint?: string;
  Icon: LucideIcon;
}

const SEX: Choice<Sex>[] = [
  { v: "female", l: "زن", Icon: Venus },
  { v: "male", l: "مرد", Icon: Mars },
];
const ACTIVITY: Choice<Activity>[] = [
  { v: "sedentary", l: "کم‌تحرک", hint: "بیشتر روز پشت میز", Icon: Sofa },
  { v: "light", l: "سبک", hint: "پیاده‌روی کوتاه، کارهای خانه", Icon: Footprints },
  { v: "moderate", l: "متوسط", hint: "ورزش ۳ تا ۴ روز در هفته", Icon: Bike },
  { v: "active", l: "فعال", hint: "ورزش بیشتر روزها", Icon: Dumbbell },
  { v: "very_active", l: "خیلی فعال", hint: "کار بدنی یا تمرین سنگین", Icon: Flame },
];
const GOAL: Choice<Goal>[] = [
  { v: "lose", l: "کاهش تدریجی", hint: "کمی کمتر از نیاز روزانه", Icon: TrendingDown },
  { v: "maintain", l: "حفظ وزن", hint: "همان قدر که بدنت لازم دارد", Icon: Scale },
  { v: "gain", l: "افزایش", hint: "کمی بیشتر، با پروتئین کافی", Icon: TrendingUp },
];

type NumKey = "age" | "height_cm" | "weight_kg";
const NUMBERS: Record<NumKey, { unit: string; min: number; max: number; step: number; start: number }> = {
  age: { unit: "سال", min: 14, max: 100, step: 1, start: 30 },
  height_cm: { unit: "سانتی‌متر", min: 120, max: 230, step: 1, start: 168 },
  weight_kg: { unit: "کیلو", min: 35, max: 300, step: 0.5, start: 70 },
};

/** Same six questions and lines as the app (apps/mobile onboarding-wizard). Only نوتی speaks colloquially. */
const STEPS: { title: string; nuti: string; mood: NutiMood }[] = [
  { title: "جنسیت", nuti: "سلام! من نوتی‌ام. شش تا سؤال کوچیک، بعد هدف روزانه‌ت رو برات حساب می‌کنم.", mood: "wink" },
  { title: "سن", nuti: "چند سالته؟ قول میدم به هیچ‌کس نگم!", mood: "happy" },
  { title: "قد", nuti: "قدت چقدره؟ بدون کفش حساب کن.", mood: "wow" },
  { title: "وزن", nuti: "وزنت چند کیلوئه؟ فقط برای حساب انرژی پایه‌ست.", mood: "think" },
  { title: "میزان فعالیت", nuti: "یه روز معمولیت چقدر تحرک داره؟", mood: "happy" },
  { title: "هدف", nuti: "و آخرین سؤال: دنبال چی هستی؟", mood: "cheer" },
];

const num = (s: string) => Number(toLatinDigits(s).replace("٫", "."));
const fa = (n: number) => toPersianDigits(String(n)).replace(".", "٫");

function ChoiceCards<T extends string>({ options, value, onPick, label }: { options: Choice<T>[]; value: T | null; onPick: (v: T) => void; label: string }) {
  const grid = options.length === 2;
  return (
    <div role="radiogroup" aria-label={label} className={grid ? "grid grid-cols-2 gap-3" : "grid gap-2.5"}>
      {options.map(({ v, l, hint, Icon }) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(v)}
            className={`rounded-[var(--radius-card)] border-2 text-start transition-colors duration-150 ${on ? "border-green bg-mint" : "border-line bg-surface hover:border-green/50"} ${grid ? "grid justify-items-center gap-2 py-6" : "flex min-h-16 items-center gap-3 px-4 py-3"}`}
          >
            <span className={`grid place-items-center rounded-full ${on ? "bg-surface text-green-ink" : "bg-ground text-ink-2"} ${grid ? "size-14" : "size-11"}`}>
              <Icon size={grid ? 28 : 22} strokeWidth={1.75} aria-hidden />
            </span>
            <span className={grid ? "text-center" : "flex-1"}>
              <span className={`block font-semibold ${grid ? "text-lg" : "text-[15px]"} ${on ? "text-green-ink" : ""}`}>{l}</span>
              {hint && <span className="block text-xs text-ink-2">{hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function NumberPicker({ k, value, onChange }: { k: NumKey; value: string; onChange: (v: string) => void }) {
  const spec = NUMBERS[k];
  const n = num(value);
  const ok = n >= spec.min && n <= spec.max;
  const bump = (d: number) => {
    const base = Number.isFinite(n) && value.trim() ? n : spec.start;
    onChange(fa(Math.min(spec.max, Math.max(spec.min, +(base + d).toFixed(1)))));
  };
  const btn = "grid size-14 place-items-center rounded-full border border-line bg-surface text-green-ink hover:bg-mint";
  return (
    <div className="grid justify-items-center gap-2">
      <div className="flex items-center gap-4">
        <button type="button" aria-label={`کم کردن، یک ${spec.unit}`} onClick={() => bump(-spec.step)} className={btn}><Minus size={24} aria-hidden /></button>
        <label className="grid justify-items-center">
          <input
            inputMode={spec.step < 1 ? "decimal" : "numeric"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            maxLength={5}
            aria-label={spec.unit}
            className="tabular w-36 bg-transparent text-center text-[52px] font-black leading-[68px] outline-none"
          />
          <span className="text-sm text-ink-2">{spec.unit}</span>
        </label>
        <button type="button" aria-label={`زیاد کردن، یک ${spec.unit}`} onClick={() => bump(spec.step)} className={btn}><Plus size={24} aria-hidden /></button>
      </div>
      {!ok && value.trim() !== "" && <p role="alert" className="text-sm text-fat-ink">بین {fa(spec.min)} تا {fa(spec.max)} {spec.unit}</p>}
    </div>
  );
}

/** The goals counted up from zero (skipped under prefers-reduced-motion). */
function GoalsReveal({ goals }: { goals: Goals }) {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setK(1);
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100);
      setK(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const tiles = [
    ["پروتئین", goals.protein_g, "text-purple-ink", "bg-purple-tint"],
    ["کربوهیدرات", goals.carbs_g, "text-carbs", "bg-carbs/10"],
    ["چربی", goals.fat_g, "text-fat-ink", "bg-fat/10"],
  ] as const;
  return (
    <section aria-label={`هدف روزانه: ${faInt(goals.kcal)} کالری`} className="grid gap-3">
      <div className="grid justify-items-center gap-1 rounded-[var(--radius-card)] bg-mint px-4 py-6 text-green-ink">
        <p className="text-sm">هدف روزانه‌ات</p>
        <p className="tabular text-[56px] font-black leading-[72px]">{faInt(goals.kcal * k)}</p>
        <p className="text-sm">کالری</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map(([l, v, c, bg]) => (
          <div key={l} className={`grid justify-items-center gap-0.5 rounded-[var(--radius-card)] py-4 ${bg} ${c}`}>
            <p className="tabular text-2xl font-black">{faInt(v * k)}</p>
            <p className="text-xs">گرم {l}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-xs leading-6 text-ink-2">
        بر پایه فرمول <bdi dir="ltr">Mifflin-St Jeor</bdi>. نقطه شروع است، نه توصیه پزشکی؛ از «من › پروفایل و اهداف» عوضش می‌کنی.
      </p>
    </section>
  );
}

/** First run on web: one question per screen with نوتی, ending in an animated reveal of the daily goals. */
export function OnboardingWizard({ local = false }: { local?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<OnboardingState, FormData>(saveProfileAction, {});
  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Sex | null>(null);
  const [nums, setNums] = useState<Record<NumKey, string>>({ age: fa(NUMBERS.age.start), height_cm: fa(NUMBERS.height_cm.start), weight_kg: fa(NUMBERS.weight_kg.start) });
  const [touched, setTouched] = useState<Partial<Record<NumKey, boolean>>>({});
  const [activity, setActivity] = useState<Activity | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [tz, setTz] = useState("America/Toronto");
  useEffect(() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto"), []);

  const done = step >= STEPS.length;
  const numKey = (["age", "height_cm", "weight_kg"] as const)[step - 1];
  const numOk = (k: NumKey) => num(nums[k]) >= NUMBERS[k].min && num(nums[k]) <= NUMBERS[k].max;
  const profile =
    sex && activity && goal && numOk("age") && numOk("height_cm") && numOk("weight_kg")
      ? { sex, age: Math.round(num(nums.age)), height_cm: num(nums.height_cm), weight_kg: num(nums.weight_kg), activity, goal }
      : null;
  const goals = profile ? suggestGoals(profile) : null;

  // A picked card moves on by itself after a beat, so most steps need one click.
  function pick<T>(set: (v: T) => void, v: T) {
    set(v);
    window.setTimeout(() => setStep((s) => s + 1), 260);
  }

  const s = STEPS[Math.min(step, STEPS.length - 1)]!;
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
      {profile && (
        <>
          {/* What the existing save action reads; the wizard only collects it step by step. */}
          <input type="hidden" name="sex" value={profile.sex} />
          <input type="hidden" name="age" value={profile.age} />
          <input type="hidden" name="height_cm" value={profile.height_cm} />
          <input type="hidden" name="weight_kg" value={profile.weight_kg} />
          <input type="hidden" name="activity" value={profile.activity} />
          <input type="hidden" name="goal" value={profile.goal} />
          <input type="hidden" name="timezone" value={tz} />
        </>
      )}

      {!done && (
        <div role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-valuetext={`قدم ${toPersianDigits(step + 1)} از ${toPersianDigits(STEPS.length)}`} className="grid gap-1.5">
          <div className="h-2.5 overflow-hidden rounded-full bg-track">
            <div className="h-full rounded-full bg-green transition-[width] duration-300 ease-out" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <p className="text-xs text-ink-2">قدم {toPersianDigits(step + 1)} از {toPersianDigits(STEPS.length)}</p>
        </div>
      )}

      <div key={step} className="animate-rise flex items-end gap-3" aria-live="polite">
        <Nuti mood={done ? "cheer" : s.mood} size={76} label="" />
        <p className="mb-2 flex-1 rounded-[18px] rounded-es-[6px] bg-purple-tint px-4 py-3 text-[15px] leading-7 text-purple-ink">
          {done ? "تمومه! این هدف روزانه‌ته. با هم حواسمون بهش هست." : s.nuti}
        </p>
      </div>

      <div key={`q-${step}`} className="animate-rise grid gap-5">
        {!done && <h2 className="text-[22px] font-black">{s.title}</h2>}
        {step === 0 && <ChoiceCards label="جنسیت" options={SEX} value={sex} onPick={(v) => pick(setSex, v)} />}
        {numKey && (
          <NumberPicker
            k={numKey}
            value={nums[numKey]}
            onChange={(v) => {
              setNums((n) => ({ ...n, [numKey]: v }));
              setTouched((t) => ({ ...t, [numKey]: true }));
            }}
          />
        )}
        {step === 4 && <ChoiceCards label="میزان فعالیت" options={ACTIVITY} value={activity} onPick={(v) => pick(setActivity, v)} />}
        {step === 5 && <ChoiceCards label="هدف" options={GOAL} value={goal} onPick={(v) => pick(setGoal, v)} />}
        {done && goals && <GoalsReveal goals={goals} />}
      </div>

      {state.error && <p role="alert" className="text-sm text-error">{state.error}</p>}
      {done ? (
        <button type="submit" disabled={pending || !goals} className="h-12 rounded-[var(--radius-btn)] bg-green-ink text-[15px] font-semibold text-surface disabled:opacity-60">
          {pending ? "در حال ذخیره…" : "بزن بریم!"}
        </button>
      ) : (
        numKey && (
          <button type="button" disabled={!numOk(numKey)} onClick={() => setStep((x) => x + 1)} className="h-12 rounded-[var(--radius-btn)] bg-green-ink text-[15px] font-semibold text-surface disabled:opacity-60">
            {touched[numKey] ? "بعدی" : `همین ${fa(num(nums[numKey]))} ${NUMBERS[numKey].unit} درسته`}
          </button>
        )
      )}
      {step > 0 && (
        <button type="button" onClick={() => setStep((x) => x - 1)} className="flex min-h-10 items-center justify-center gap-1 justify-self-center px-3 text-sm text-green-ink hover:underline">
          <ChevronRight size={18} aria-hidden />
          قدم قبل
        </button>
      )}
    </form>
  );
}
