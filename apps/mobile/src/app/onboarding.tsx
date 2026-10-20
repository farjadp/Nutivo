import { suggestGoals, toLatinDigits, toPersianDigits } from "@nutivo/core";
import { getCalendars } from "expo-localization";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { api, type ProfileInput } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Button } from "@/ui/button";
import { Chips } from "@/ui/chips";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
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

export default function Onboarding() {
  const { refreshMe } = useSession();
  const [sex, setSex] = useState<ProfileInput["sex"]>("male");
  const [age, setAge] = useState("35");
  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("85");
  const [activity, setActivity] = useState<ProfileInput["activity"]>("light");
  const [goal, setGoal] = useState<ProfileInput["goal"]>("lose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = useMemo<ProfileInput | null>(() => {
    const a = num(age), h = num(height), w = num(weight);
    if (!(Number.isInteger(a) && a >= 14 && a <= 100 && h >= 120 && h <= 230 && w >= 35 && w <= 300)) return null;
    return { sex, age: a, height_cm: h, weight_kg: w, activity, goal, timezone: getCalendars()[0]?.timeZone ?? "America/Toronto" };
  }, [sex, age, height, weight, activity, goal]);
  const goals = profile ? suggestGoals(profile) : null;

  async function save() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    const r = await api.onboard(profile);
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    await refreshMe();
  }

  return (
    <Screen>
      <View className="mt-4 gap-2">
        <Text className="font-heavy text-[24px] leading-[38px]">چند تا عدد، برای شروع</Text>
        <Text className="text-[15px] leading-7 text-ink-2">از این‌ها هدف روزانه‌ات را حساب می‌کنیم. بعداً قابل تغییر است.</Text>
      </View>

      <Chips label="جنسیت" value={sex} onChange={setSex} options={[{ v: "male", l: "مرد" }, { v: "female", l: "زن" }]} />
      <View className="flex-row gap-3">
        <Field className="flex-1" label="سن" unit="سال" value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} />
        <Field className="flex-1" label="قد" unit="سانت" value={height} onChangeText={setHeight} keyboardType="decimal-pad" maxLength={5} />
        <Field className="flex-1" label="وزن" unit="کیلو" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={5} />
      </View>
      <Chips label="میزان فعالیت" value={activity} onChange={setActivity} options={ACTIVITY} />
      <Chips label="هدف" value={goal} onChange={setGoal} options={GOAL} />

      {goals ? (
        <View accessibilityLabel="اهداف پیشنهادی" className="gap-3 rounded-card border border-line bg-surface p-4">
          <Text className="font-strong text-base">اهداف روزانه پیشنهادی</Text>
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
        <Text className="text-sm text-error">سن، قد و وزن را در محدوده درست وارد کن.</Text>
      )}

      {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}
      <Button label="شروع" busyLabel="در حال ذخیره…" busy={busy} disabled={!goals} onPress={save} />
    </Screen>
  );
}
