import { suggestGoals, toLatinDigits, toPersianDigits, type Goals, type NutiMood } from "@nutivo/core";
import { getCalendars } from "expo-localization";
import { Bike, ChevronRight, Dumbbell, Flame, Footprints, Mars, Minus, Plus, Scale, Sofa, TrendingDown, TrendingUp, Venus, type LucideIcon } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, TextInput, View } from "react-native";
import { useCSSVariable } from "uniwind";
import type { ProfileInput } from "@/lib/api";
import { faInt } from "@/lib/format";
import { useReduceMotion } from "@/lib/motion";
import { Button } from "@/ui/button";
import { Nuti } from "@/ui/nuti";
import { Text } from "@/ui/text";

type Sex = ProfileInput["sex"];
type Activity = ProfileInput["activity"];
type Goal = ProfileInput["goal"];

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

interface NumberStep {
  key: "age" | "height_cm" | "weight_kg";
  unit: string;
  min: number;
  max: number;
  step: number;
  start: number;
}
const NUMBERS: Record<NumberStep["key"], NumberStep> = {
  age: { key: "age", unit: "سال", min: 14, max: 100, step: 1, start: 30 },
  height_cm: { key: "height_cm", unit: "سانتی‌متر", min: 120, max: 230, step: 1, start: 168 },
  weight_kg: { key: "weight_kg", unit: "کیلو", min: 35, max: 300, step: 0.5, start: 70 },
};

/** Every step: what نوتی says, her mood, and what is asked. Only نوتی speaks colloquially. */
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

function ProgressBar({ step }: { step: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: (step + 1) / STEPS.length, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [step, w]);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="پیشرفت"
      accessibilityValue={{ min: 1, max: STEPS.length, now: Math.min(step + 1, STEPS.length), text: `قدم ${toPersianDigits(Math.min(step + 1, STEPS.length))} از ${toPersianDigits(STEPS.length)}` }}
      className="gap-1.5"
    >
      <View className="h-2.5 overflow-hidden rounded-full bg-track">
        {/* Width is animated data, so it cannot be a class. */}
        <Animated.View className="h-2.5 rounded-full bg-green" style={{ width: w.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
      </View>
      <Text className="text-xs text-ink-2">قدم {toPersianDigits(Math.min(step + 1, STEPS.length))} از {toPersianDigits(STEPS.length)}</Text>
    </View>
  );
}

/** نوتی with her line for this step; she hops in each time the step changes. */
function NutiLine({ mood, text, k }: { mood: NutiMood; text: string; k: number }) {
  const reduce = useReduceMotion();
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    y.setValue(-10);
    Animated.timing(y, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    AccessibilityInfo.announceForAccessibility(text);
  }, [k, reduce, y, text]);
  return (
    <View className="flex-row items-end gap-3">
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        <Nuti mood={mood} size={76} />
      </Animated.View>
      <View className="mb-2 flex-1 rounded-[18px] rounded-es-[6px] bg-purple-tint px-4 py-3">
        <Text className="text-[15px] leading-7 text-purple-ink">{text}</Text>
      </View>
    </View>
  );
}

function ChoiceCards<T extends string>({ options, value, onPick, label }: { options: Choice<T>[]; value: T | null; onPick: (v: T) => void; label: string }) {
  const [green, ink2] = useCSSVariable(["--color-green-ink", "--color-ink-2"]) as string[];
  const grid = options.length === 2;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className={grid ? "flex-row gap-3" : "gap-2.5"}>
      {options.map(({ v, l, hint, Icon }) => {
        const on = v === value;
        return (
          <Pressable
            key={v}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityHint={hint}
            onPress={() => onPick(v)}
            className={`rounded-card border-2 active:opacity-80 ${on ? "border-green bg-mint" : "border-line bg-surface"} ${grid ? "flex-1 items-center gap-2 py-6" : "min-h-16 flex-row items-center gap-3 px-4 py-3"}`}
          >
            <View className={`items-center justify-center rounded-full ${on ? "bg-surface" : "bg-ground"} ${grid ? "size-14" : "size-11"}`}>
              <Icon color={on ? green : ink2} size={grid ? 28 : 22} />
            </View>
            <View className={grid ? "items-center" : "flex-1"}>
              <Text className={`font-strong ${grid ? "text-lg" : "text-[15px]"} ${on ? "text-green-ink" : ""}`}>{l}</Text>
              {hint && <Text className="text-xs text-ink-2">{hint}</Text>}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A big number with − / + on each side; it can also be typed. */
function NumberPicker({ spec, value, onChange }: { spec: NumberStep; value: string; onChange: (v: string) => void }) {
  const ink = useCSSVariable("--color-green-ink") as string;
  const n = num(value);
  const ok = n >= spec.min && n <= spec.max;
  const bump = (d: number) => {
    const base = Number.isFinite(n) && value.trim() ? n : spec.start;
    onChange(fa(Math.min(spec.max, Math.max(spec.min, +(base + d).toFixed(1)))));
  };
  return (
    <View className="items-center gap-2">
      <View className="flex-row items-center gap-4">
        <Pressable accessibilityRole="button" accessibilityLabel={`کم کردن، یک ${spec.unit}`} onPress={() => bump(-spec.step)} className="size-14 items-center justify-center rounded-full border border-line bg-surface active:bg-mint">
          <Minus color={ink} size={24} />
        </Pressable>
        <View className="min-w-36 items-center">
          <TextInput
            accessibilityLabel={spec.unit}
            value={value}
            onChangeText={onChange}
            keyboardType={spec.step < 1 ? "decimal-pad" : "number-pad"}
            maxLength={5}
            selectTextOnFocus
            className="font-heavy min-w-32 text-center text-[52px] leading-[68px] text-ink"
          />
          <Text className="text-sm text-ink-2">{spec.unit}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`زیاد کردن، یک ${spec.unit}`} onPress={() => bump(spec.step)} className="size-14 items-center justify-center rounded-full border border-line bg-surface active:bg-mint">
          <Plus color={ink} size={24} />
        </Pressable>
      </View>
      {!ok && value.trim() !== "" && (
        <Text accessibilityRole="alert" className="text-sm text-fat-ink">
          بین {fa(spec.min)} تا {fa(spec.max)} {spec.unit}
        </Text>
      )}
    </View>
  );
}

/** The goals, counted up from zero, each in its own colour tile. */
function GoalsReveal({ goals }: { goals: Goals }) {
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const [k, setK] = useState(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    const id = t.addListener(({ value }) => setK(value));
    Animated.timing(t, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => t.removeListener(id);
  }, [reduce, t]);
  const tiles = [
    { l: "پروتئین", v: goals.protein_g, u: "گرم", c: "text-purple-ink", bg: "bg-purple-tint" },
    { l: "کربوهیدرات", v: goals.carbs_g, u: "گرم", c: "text-carbs", bg: "bg-carbs/10" },
    { l: "چربی", v: goals.fat_g, u: "گرم", c: "text-fat-ink", bg: "bg-fat/10" },
  ] as const;
  return (
    <View accessible accessibilityLabel={`هدف روزانه: ${toPersianDigits(Math.round(goals.kcal))} کالری`} className="gap-3">
      <View className="items-center gap-1 rounded-card bg-mint px-4 py-6">
        <Text className="text-sm text-green-ink">هدف روزانه‌ات</Text>
        <Text className="font-heavy text-[56px] leading-[72px] text-green-ink">{faInt(goals.kcal * k)}</Text>
        <Text className="text-sm text-green-ink">کالری</Text>
      </View>
      <View className="flex-row gap-2">
        {tiles.map((x) => (
          <View key={x.l} className={`flex-1 items-center gap-0.5 rounded-card py-4 ${x.bg}`}>
            <Text className={`font-heavy text-2xl ${x.c}`}>{toPersianDigits(Math.round(x.v * k))}</Text>
            <Text className={`text-xs ${x.c}`}>{x.u} {x.l}</Text>
          </View>
        ))}
      </View>
      <Text className="text-center text-xs leading-6 text-ink-2">بر پایه فرمول Mifflin-St Jeor. نقطه شروع است، نه توصیه پزشکی؛ از «من › پروفایل و اهداف» عوضش می‌کنی.</Text>
    </View>
  );
}

/** First run, one question per screen with نوتی, ending in an animated reveal of the daily goals. */
export function OnboardingWizard({ onSubmit }: { onSubmit: (p: ProfileInput) => Promise<string | null> }) {
  const reduce = useReduceMotion();
  const ink = useCSSVariable("--color-green-ink") as string;
  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Sex | null>(null);
  const [nums, setNums] = useState({ age: fa(NUMBERS.age.start), height_cm: fa(NUMBERS.height_cm.start), weight_kg: fa(NUMBERS.weight_kg.start) });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [activity, setActivity] = useState<Activity | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slide = useRef(new Animated.Value(1)).current;
  const done = step >= STEPS.length;

  useEffect(() => {
    if (reduce) return;
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [step, reduce, slide]);

  const numKey = (["age", "height_cm", "weight_kg"] as const)[step - 1];
  const numOk = (k: NumberStep["key"]) => num(nums[k]) >= NUMBERS[k].min && num(nums[k]) <= NUMBERS[k].max;
  const canNext = step === 0 ? !!sex : numKey ? numOk(numKey) : step === 4 ? !!activity : step === 5 ? !!goal : true;

  const profile: ProfileInput | null =
    sex && activity && goal && numOk("age") && numOk("height_cm") && numOk("weight_kg")
      ? { sex, age: Math.round(num(nums.age)), height_cm: num(nums.height_cm), weight_kg: num(nums.weight_kg), activity, goal, timezone: getCalendars()[0]?.timeZone ?? "America/Toronto" }
      : null;
  const goals = profile ? suggestGoals(profile) : null;

  // A picked card moves on by itself after a beat, so most steps need one tap.
  function pick<T>(set: (v: T) => void, v: T) {
    set(v);
    setTimeout(() => setStep((s) => s + 1), reduce ? 0 : 260);
  }

  async function save() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    const err = await onSubmit(profile);
    setBusy(false);
    if (err) setError(err);
  }

  const s = STEPS[Math.min(step, STEPS.length - 1)]!;
  return (
    <View className="gap-5">
      {!done && <ProgressBar step={step} />}
      <NutiLine k={step} mood={done ? "cheer" : s.mood} text={done ? "تمومه! این هدف روزانه‌ته. با هم حواسمون بهش هست." : s.nuti} />

      <Animated.View
        className="gap-5"
        style={{ opacity: slide, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] }}
      >
        {!done && <Text accessibilityRole="header" className="font-heavy text-[22px] leading-[34px]">{s.title}</Text>}
        {step === 0 && <ChoiceCards label="جنسیت" options={SEX} value={sex} onPick={(v) => pick(setSex, v)} />}
        {numKey && (
          <NumberPicker
            spec={NUMBERS[numKey]}
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
      </Animated.View>

      {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}
      {done ? (
        <Button label="بزن بریم!" busyLabel="در حال ذخیره…" busy={busy} disabled={!goals} onPress={() => void save()} />
      ) : (
        numKey && (
          <Button
            label={touched[numKey] ? "بعدی" : `همین ${fa(num(nums[numKey]))} ${NUMBERS[numKey].unit} درسته`}
            disabled={!canNext}
            onPress={() => setStep((x) => x + 1)}
          />
        )
      )}
      {step > 0 && (
        <Pressable accessibilityRole="button" onPress={() => setStep((x) => x - 1)} className="min-h-11 flex-row items-center justify-center gap-1 self-center px-3 active:opacity-70">
          <ChevronRight color={ink} size={18} />
          <Text className="text-sm text-green-ink">قدم قبل</Text>
        </Pressable>
      )}
    </View>
  );
}
