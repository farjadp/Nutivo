import { suggestGoals, toLatinDigits, toPersianDigits } from "@nutivo/core";
import { getCalendars } from "expo-localization";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import type { ProfileInput } from "@/lib/api";
import { Button } from "@/ui/button";
import { Chips } from "@/ui/chips";
import { Field } from "@/ui/field";
import { Text } from "@/ui/text";

const ACTIVITY: { v: ProfileInput["activity"]; l: string }[] = [
  { v: "sedentary", l: "کم‌تحرک" },
  { v: "light", l: "سبک" },
  { v: "moderate", l: "متوسط" },
  { v: "active", l: "فعال" },
  { v: "very_active", l: "خیلی فعال" },
];
const GOAL: { v: ProfileInput["goal"]; l: string }[] = [
  { v: "lose", l: "کاهش تدریجی" },
  { v: "maintain", l: "حفظ وزن" },
  { v: "gain", l: "افزایش" },
];

const num = (s: string) => Number(toLatinDigits(s).replace("٫", "."));
const field = (n: number | null | undefined) => (n == null ? "" : toPersianDigits(String(n)).replace(".", "٫"));

export interface ProfileStart {
  sex: ProfileInput["sex"] | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: ProfileInput["activity"] | null;
  goal: ProfileInput["goal"] | null;
}

interface Props {
  /** Current values when editing; omitted on first run, where nothing is pre-filled. */
  initial?: ProfileStart;
  submitLabel: string;
  /** Saves and returns an error message, or null on success. */
  onSubmit: (p: ProfileInput) => Promise<string | null>;
  /** Called when the form starts or stops differing from `initial`. */
  onDirtyChange?: (dirty: boolean) => void;
}

/** Body numbers, activity and goal, with the daily goals they lead to. Used by onboarding and «پروفایل و اهداف». */
export function ProfileForm({ initial, submitLabel, onSubmit, onDirtyChange }: Props) {
  const [sex, setSex] = useState(initial?.sex ?? null);
  const [age, setAge] = useState(field(initial?.age));
  const [height, setHeight] = useState(field(initial?.height_cm));
  const [weight, setWeight] = useState(field(initial?.weight_kg));
  const [activity, setActivity] = useState(initial?.activity ?? null);
  const [goal, setGoal] = useState(initial?.goal ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = useMemo<ProfileInput | null>(() => {
    const a = num(age), h = num(height), w = num(weight);
    if (!sex || !activity || !goal) return null;
    if (!(Number.isInteger(a) && a >= 14 && a <= 100 && h >= 120 && h <= 230 && w >= 35 && w <= 300)) return null;
    return { sex, age: a, height_cm: h, weight_kg: w, activity, goal, timezone: getCalendars()[0]?.timeZone ?? "America/Toronto" };
  }, [sex, age, height, weight, activity, goal]);
  const goals = profile ? suggestGoals(profile) : null;

  const dirty = Boolean(
    initial &&
      (sex !== initial.sex ||
        activity !== initial.activity ||
        goal !== initial.goal ||
        num(age) !== initial.age ||
        num(height) !== initial.height_cm ||
        num(weight) !== initial.weight_kg),
  );
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  // What is still missing, named, instead of a red error while the form is half filled.
  const hint = (() => {
    const out = (v: string, lo: number, hi: number) => v.trim() !== "" && !(num(v) >= lo && num(v) <= hi);
    if (out(age, 14, 100)) return { bad: true, text: "سن باید بین ۱۴ تا ۱۰۰ سال باشد." };
    if (out(height, 120, 230)) return { bad: true, text: "قد باید بین ۱۲۰ تا ۲۳۰ سانت باشد." };
    if (out(weight, 35, 300)) return { bad: true, text: "وزن باید بین ۳۵ تا ۳۰۰ کیلو باشد." };
    const missing = [!sex && "جنسیت", !age.trim() && "سن", !height.trim() && "قد", !weight.trim() && "وزن", !activity && "میزان فعالیت", !goal && "هدف"].filter(Boolean);
    return { bad: false, text: `برای دیدن هدف‌های روزانه، ${missing.join("، ")} را هم مشخص کن.` };
  })();

  async function save() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    const err = await onSubmit(profile);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <>
      <Chips label="جنسیت" value={sex} onChange={setSex} options={[{ v: "male", l: "مرد" }, { v: "female", l: "زن" }]} />
      <View className="flex-row gap-3">
        <Field className="flex-1" label="سن" unit="سال" placeholder="۳۵" value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} />
        <Field className="flex-1" label="قد" unit="سانت" placeholder="۱۷۰" value={height} onChangeText={setHeight} keyboardType="decimal-pad" maxLength={5} />
        <Field className="flex-1" label="وزن" unit="کیلو" placeholder="۷۰" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={5} />
      </View>
      <Chips label="میزان فعالیت" value={activity} onChange={setActivity} options={ACTIVITY} />
      <Chips label="هدف" value={goal} onChange={setGoal} options={GOAL} />

      {goals ? (
        <View accessibilityLabel="اهداف روزانه" className="gap-3 rounded-card border border-line bg-surface p-4">
          <Text className="font-strong text-base">{initial ? "اهداف روزانه" : "اهداف روزانه پیشنهادی"}</Text>
          <View className="flex-row">
            {(
              [
                ["کالری", goals.kcal, "text-green-ink"],
                ["پروتئین", goals.protein_g, "text-purple-ink"],
                ["کربو", goals.carbs_g, "text-carbs"],
                ["چربی", goals.fat_g, "text-fat-ink"],
              ] as const
            ).map(([l, v, c]) => (
              <View key={l} className="flex-1 items-center gap-0.5">
                <Text className="text-xs text-ink-2">{l}</Text>
                <Text className={`font-strong text-lg ${c}`}>{toPersianDigits(Math.round(v))}</Text>
              </View>
            ))}
          </View>
          <Text className="text-xs leading-6 text-ink-2">بر پایه فرمول Mifflin-St Jeor. یک نقطه شروع است، نه توصیه پزشکی.</Text>
        </View>
      ) : (
        <Text className={`text-sm leading-6 ${hint.bad ? "text-error" : "text-ink-2"}`}>{hint.text}</Text>
      )}

      {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}
      <Button label={submitLabel} busyLabel="در حال ذخیره…" busy={busy} disabled={!goals || (initial && !dirty)} onPress={save} />
    </>
  );
}
