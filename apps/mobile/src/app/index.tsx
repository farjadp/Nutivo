import type { DayView } from "@nutivo/core";
import { toPersianDigits } from "@nutivo/core";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Button } from "@/ui/button";
import { Logo } from "@/ui/logo";
import { Ring } from "@/ui/ring";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

const MEAL: Record<DayView["meals"][number]["meal_type"], string> = { breakfast: "صبحانه", lunch: "ناهار", snack: "میان‌وعده", dinner: "شام" };
const fa = (n: number) => toPersianDigits(Math.round(n));

function Macro({ label, value, goal, bar, ink }: { label: string; value: number; goal: number; bar: string; ink: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <View className="flex-1 gap-1.5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-xs text-ink-2">{label}</Text>
        <Text className={`font-strong text-xs ${ink}`}>
          {fa(value)}<Text className="text-xs text-ink-2">/{fa(goal)}</Text>
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-track">
        <View className={`h-2 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}

export default function Today() {
  const { signOut, me } = useSession();
  const [day, setDay] = useState<DayView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.today();
    setLoading(false);
    if (r.ok) {
      setDay(r.data);
      setError(null);
    } else setError(r.error);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colorsClassName="accent-green" tintColorClassName="accent-green" />}>
      <View className="flex-row items-center justify-between">
        <Logo height={28} />
        <Pressable accessibilityRole="button" accessibilityLabel="خروج از حساب" onPress={signOut} className="rounded-full px-3 py-2 active:bg-track">
          <Text className="text-sm text-ink-2">خروج</Text>
        </Pressable>
      </View>

      {error && (
        <View className="gap-3 rounded-card bg-surface p-4">
          <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>
          <Button label="دوباره" variant="quiet" onPress={load} />
        </View>
      )}

      {day && (
        <>
          <View className="items-center gap-4 rounded-card border border-line bg-surface p-5">
            <Text className="font-strong self-start text-base">امروز</Text>
            <Ring value={day.totals.kcal} goal={day.goals.kcal}>
              <Text className="font-heavy text-[34px] leading-[44px]">{fa(Math.abs(day.remaining.kcal))}</Text>
              <Text className="text-xs text-ink-2">{day.remaining.kcal >= 0 ? "کالری مانده" : "کالری بیشتر از هدف"}</Text>
            </Ring>
            <View className="w-full flex-row gap-4">
              <Macro label="پروتئین" value={day.totals.protein_g} goal={day.goals.protein_g} bar="bg-purple" ink="text-purple-ink" />
              <Macro label="کربو" value={day.totals.carbs_g} goal={day.goals.carbs_g} bar="bg-carbs" ink="text-carbs" />
              <Macro label="چربی" value={day.totals.fat_g} goal={day.goals.fat_g} bar="bg-fat" ink="text-fat-ink" />
            </View>
            {day.streak > 1 && <Text className="text-xs text-green-ink">زنجیره {fa(day.streak)} روزه</Text>}
          </View>

          {day.meals.length ? (
            <View className="gap-3">
              {day.meals.map((m) => (
                <View key={m.meal_type} className="gap-2 rounded-card border border-line bg-surface p-4">
                  <View className="flex-row justify-between">
                    <Text className="font-strong text-[15px]">{MEAL[m.meal_type]}</Text>
                    <Text className="text-sm text-ink-2">{fa(m.kcal)} کالری</Text>
                  </View>
                  {m.items.map((it, i) => (
                    <View key={i} className="flex-row justify-between">
                      <Text className="text-sm">{it.name}{it.estimated ? " ~" : ""}</Text>
                      <Text className="text-sm text-ink-2">{fa(it.kcal)}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <View className="gap-1 rounded-card bg-mint p-4">
              <Text className="font-strong text-[15px] text-green-ink">امروز هنوز چیزی ثبت نشده</Text>
              <Text className="text-sm leading-6 text-ink-2">ثبت وعده از اپ در قدم بعد اضافه می‌شود. فعلاً از وب یا بات تلگرام ثبت کن؛ اینجا همان روز را می‌بینی.</Text>
            </View>
          )}
        </>
      )}
      {me?.email && <Text className="text-center text-xs text-ink-2">{me.email}</Text>}
    </Screen>
  );
}
