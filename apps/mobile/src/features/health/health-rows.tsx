import { toPersianDigits, type AppProfile } from "@nutivo/core";
import { getCalendars } from "expo-localization";
import { HeartPulse, Scale } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { api } from "@/lib/api";
import { HEALTH_NAME, openHealthSettings } from "@/lib/health";
import { useHealth } from "@/lib/health-provider";
import { Text } from "@/ui/text";

const kgFa = (n: number) => toPersianDigits(String(n)).replace(".", "٫");

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  return d <= 0 ? "امروز" : d === 1 ? "دیروز" : `${toPersianDigits(d)} روز پیش`;
}

/** «من» row: read-only access to Apple Health / Health Connect, on only after the system consent sheet. */
export function HealthRow() {
  const h = useHealth();
  const [green, track] = useCSSVariable(["--color-green-ink", "--color-track"]) as string[];

  async function toggle(on: boolean) {
    const ok = await h.setOn(on);
    if (!ok) {
      Alert.alert(`${HEALTH_NAME} در دسترس نیست`, "اجازه داده نشد یا این گوشی آن را ندارد. می‌توانی بعداً از تنظیمات سلامت گوشی اجازه بدهی.", [
        { text: "باشه", style: "cancel" },
        { text: "باز کردن تنظیمات", onPress: openHealthSettings },
      ]);
      return;
    }
    if (!on) {
      Alert.alert("خواندن متوقف شد", `Nutivo دیگر از ${HEALTH_NAME} نمی‌خواند. برای برداشتن کامل اجازه، از تنظیمات سلامت گوشی اقدام کن.`, [
        { text: "باشه", style: "cancel" },
        { text: "باز کردن تنظیمات", onPress: openHealthSettings },
      ]);
    }
  }

  if (!h.available) {
    return (
      <View className="min-h-14 flex-row items-center gap-3 px-4 py-3">
        <HeartPulse color={green} size={20} />
        <View className="flex-1">
          <Text className="text-[15px]">{HEALTH_NAME}</Text>
          <Text className="text-xs text-ink-2">روی این گوشی در دسترس نیست.</Text>
        </View>
      </View>
    );
  }

  // HealthKit never says "denied" for reads; on with nothing at all usually means access is off in the phone's settings.
  const nothing = h.on && !h.weight && !h.activity?.steps && !h.activity?.activeKcal;

  return (
    <>
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={HEALTH_NAME}
      accessibilityState={{ checked: h.on }}
      onPress={() => void toggle(!h.on)}
      className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-track"
    >
      <HeartPulse color={green} size={20} />
      <View className="flex-1">
        <Text className="text-[15px]">{HEALTH_NAME}</Text>
        <Text className="text-xs leading-5 text-ink-2">
          {h.on ? "قدم‌ها، انرژی فعالیت و وزن را فقط می‌خوانیم؛ چیزی نوشته نمی‌شود." : "خاموش. با روشن کردن، قدم‌ها و وزنت را از گوشی می‌خوانیم."}
        </Text>
      </View>
      <Switch importantForAccessibility="no-hide-descendants" accessibilityElementsHidden value={h.on} onValueChange={(v) => void toggle(v)} trackColor={{ true: green, false: track }} />
    </Pressable>
    {nothing && (
      <Pressable accessibilityRole="button" onPress={openHealthSettings} className="min-h-11 justify-center gap-0.5 border-t border-line px-4 py-2 active:bg-track">
        <Text className="text-xs leading-5 text-ink-2">هنوز چیزی از {`\u2068${HEALTH_NAME}\u2069`} نرسیده. اگر قدم یا وزن ثبت کرده‌ای، احتمالاً اجازه خواندن خاموش است.</Text>
        <Text className="font-strong text-sm text-green-ink">بررسی اجازه‌ها</Text>
      </Pressable>
    )}
    </>
  );
}

/**
 * When the health store has a weight that differs from the profile, offer to use it. The goals are
 * recomputed from it, so this never happens without the user's tap.
 */
export function WeightSuggestion({ profile, onUpdated }: { profile: AppProfile | null; onUpdated: () => void }) {
  const h = useHealth();
  const green = useCSSVariable("--color-green-ink") as string;
  const [busy, setBusy] = useState(false);
  const w = h.weight;
  if (!h.on || !w || !profile?.weight_kg || !profile.sex || !profile.age || !profile.height_cm || !profile.activity || !profile.goal) return null;
  if (Math.abs(w.kg - profile.weight_kg) < 0.3 || h.dismissedWeightAt === w.at || w.kg < 35 || w.kg > 300) return null;

  async function apply() {
    if (!profile || !w) return;
    setBusy(true);
    const r = await api.onboard({
      sex: profile.sex!,
      age: profile.age!,
      height_cm: profile.height_cm!,
      weight_kg: w.kg,
      activity: profile.activity!,
      goal: profile.goal!,
      timezone: getCalendars()[0]?.timeZone ?? "America/Toronto",
    });
    setBusy(false);
    if (!r.ok) return Alert.alert("به‌روز نشد", r.error, [{ text: "باشه" }]);
    h.dismissWeight(w.at);
    onUpdated();
  }

  return (
    <View className="gap-3 rounded-card border border-line bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <Scale color={green} size={20} />
        {/* Starts in Persian and isolates the English name, so the line keeps its RTL order. */}
        <Text className="flex-1 text-[15px] leading-7">
          وزنت در {`\u2068${HEALTH_NAME}\u2069`} <Text className="font-strong text-[15px]">{kgFa(w.kg)} کیلو</Text> است ({daysAgo(w.at)})؛ در پروفایل {kgFa(profile.weight_kg)} کیلو ثبت شده.
        </Text>
      </View>
      <Text className="text-xs leading-6 text-ink-2">با به‌روز کردن، هدف‌های روزانه دوباره حساب می‌شوند.</Text>
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void apply()}
          className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-btn bg-green-ink active:opacity-80"
        >
          {busy && <ActivityIndicator size="small" colorClassName="accent-on-green" />}
          <Text className="font-strong text-sm text-on-green">وزن را به‌روز کن</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => h.dismissWeight(w.at)} className="min-h-11 justify-center rounded-btn px-4 active:bg-track">
          <Text className="text-sm text-ink-2">نه، ممنون</Text>
        </Pressable>
      </View>
    </View>
  );
}
