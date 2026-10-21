import { daySeed, nutiSay, type AppDay, type AppItem, type NutiSituation } from "@nutivo/core";
import { router } from "expo-router";
import { Footprints, UserRound } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, PanResponder, Pressable, RefreshControl, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { PasswordOffer } from "@/features/auth/password-offer";
import { DayStrip } from "@/features/day/day-strip";
import { QuickRepeats } from "@/features/day/quick-repeats";
import { NakhonakCard } from "@/features/nakhonak/nakhonak-card";
import { api } from "@/lib/api";
import { addDays, faDayLabel, faDayWord, faInt } from "@/lib/format";
import { MEALS } from "@/lib/meals";
import { HEALTH_NAME } from "@/lib/health";
import { useHealth } from "@/lib/health-provider";
import { useSession } from "@/lib/session";
import { useUndo } from "@/lib/undo";
import { Button } from "@/ui/button";
import { FoodIconTile } from "@/ui/food-icon";
import { Logo } from "@/ui/logo";
import { NutiSays } from "@/ui/nuti";
import { Ring } from "@/ui/ring";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

function Macro({ label, value, goal, bar, ink }: { label: string; value: number; goal: number; bar: string; ink: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    // One stop for screen readers: «پروتئین، ۴۰ از ۱۲۰ گرم» instead of three loose numbers.
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: Math.round(goal), now: Math.round(value), text: `${faInt(value)} از ${faInt(goal)} گرم` }}
      className="flex-1 gap-1.5"
    >
      <View className="flex-row items-baseline justify-between">
        <Text className="text-xs text-ink-2">{label}</Text>
        <Text className={`font-strong text-xs ${ink}`}>
          {faInt(value)}<Text className="text-xs text-ink-2">/{faInt(goal)}</Text>
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-track">
        {/* Width is data, so it cannot be a class. */}
        <View className={`h-2 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}

/** Which of نوتی's lines fits today. Numbers come from the engine's day view only. */
function situation(d: AppDay): { key: NutiSituation; vars: Record<string, string> } {
  const { day } = d;
  if (!d.items.length) return { key: "empty", vars: {} };
  if (day.complete) return { key: "complete", vars: {} };
  if (day.remaining.kcal < -day.goals.kcal * 0.1) return { key: "over", vars: { over: faInt(-day.remaining.kcal) } };
  if (day.streak >= 3) return { key: "streak", vars: { streak: faInt(day.streak) } };
  if (day.remaining.protein_g > day.goals.protein_g * 0.4 && day.remaining.kcal > 0) return { key: "proteinLow", vars: { protein: faInt(day.remaining.protein_g) } };
  return { key: "onTrack", vars: { kcal: faInt(Math.max(0, day.remaining.kcal)) } };
}

function ItemRow({ it }: { it: AppItem }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${it.name}، ${faInt(it.kcal)} کالری. ویرایش`}
      onPress={() => router.push({ pathname: "/item/[id]", params: { id: it.id } })}
      className="min-h-11 flex-row items-center gap-3 rounded-btn py-1.5 active:bg-track"
    >
      <FoodIconTile name={it.name} estimated={it.estimated} />
      <View className="min-w-0 flex-1">
        <Text className="text-[15px]" numberOfLines={1}>{it.name}</Text>
        <Text className="text-xs text-ink-2">{it.estimated ? "≈ " : ""}{faInt(it.grams)} گرم</Text>
      </View>
      <Text className="text-sm text-ink-2">{it.estimated ? "≈" : ""}{faInt(it.kcal)}</Text>
    </Pressable>
  );
}

export default function Today() {
  const ink2 = useCSSVariable("--color-ink-2") as string;
  const { version } = useUndo();
  const [data, setData] = useState<AppDay | null>(null);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (d?: string) => {
    setLoading(true);
    const r = await api.day(d);
    setLoading(false);
    if (r.ok) {
      setData(r.data);
      setError(null);
    } else setError(r.error);
  }, []);

  // Reload on open, on day change and after every save, edit or undo.
  useEffect(() => {
    void load(date);
  }, [load, date, version]);

  const today = data?.day.today;
  const shown = data?.day.date;
  const oldest = data?.strip[0]?.date;
  const go = useCallback(
    (delta: number) => {
      if (!shown || !today || !oldest) return;
      const next = addDays(shown, delta);
      if (next > today || next < oldest) return;
      setDate(next);
    },
    [shown, today, oldest],
  );

  // Horizontal swipe changes day: in RTL a swipe to the right brings the older day in from the left.
  const goRef = useRef(go);
  goRef.current = go;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 60) goRef.current(g.dx > 0 ? -1 : 1);
        },
      }),
    [],
  );

  const isToday = shown === today;
  const { me } = useSession();
  const nutiOn = me?.nuti_enabled ?? true;
  const nakhonakOn = me?.nakhonak_enabled ?? false;
  const health = useHealth();
  const act = isToday && health.on ? health.activity : null;
  // Zero is left out: an empty Health Connect reports 0 steps, which says nothing.
  const actParts = act ? [!!act.steps && `${faInt(act.steps)} قدم`, !!act.activeKcal && `${faInt(act.activeKcal)} کالری فعالیت`].filter(Boolean) : [];
  // نوتی off: the day view shows only the numbers (the brand promise is that it can be switched off).
  const nuti = data && isToday && nutiOn ? situation(data) : null;
  const line = nuti && shown ? nutiSay(nuti.key, nuti.vars, daySeed(shown)) : null;

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading && Boolean(data)} onRefresh={() => load(date)} colorsClassName="accent-green" tintColorClassName="accent-green" />}>
      <View className="flex-row items-center justify-between">
        <Logo height={28} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="من: حساب و پشتیبانی"
          onPress={() => router.navigate("/me")}
          className="size-11 items-center justify-center rounded-full bg-track active:opacity-70"
        >
          <UserRound color={ink2} size={20} strokeWidth={1.75} />
        </Pressable>
      </View>

      {isToday && <PasswordOffer />}

      {data && today && shown && <DayStrip strip={data.strip} today={today} selected={shown} onSelect={(d) => setDate(d)} />}

      {!data && !error && (
        <View className="items-center py-16">
          <ActivityIndicator colorClassName="accent-green-ink" />
        </View>
      )}

      {error && (
        <View className="gap-3 rounded-card bg-surface p-4">
          <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>
          <Button label="دوباره" variant="quiet" onPress={() => load(date)} />
        </View>
      )}

      {data && today && shown && (
        <View className="gap-6" {...pan.panHandlers}>
          <View className="items-center gap-4 rounded-card border border-line bg-surface p-5">
            <View className="flex-row items-center justify-between self-stretch">
              <View>
                {/* «امروز» / «دیروز» get the date underneath; older days show the date as the title. */}
                <Text accessibilityRole="header" className="font-strong text-base">{["امروز", "دیروز"].includes(faDayWord(shown, today)) ? faDayWord(shown, today) : faDayLabel(shown)}</Text>
                {faDayWord(shown, today) === "دیروز" && <Text className="text-xs text-ink-2">{faDayLabel(shown)}</Text>}
              </View>
              <View className="flex-row items-center gap-2">
                {!isToday && (
                  <Pressable accessibilityRole="button" onPress={() => setDate(today)} hitSlop={6} className="min-h-9 justify-center rounded-full bg-mint px-3 active:opacity-80">
                    <Text className="font-strong text-xs text-green-ink">برو به امروز</Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`گزارش ${faDayWord(shown, today)}`}
                  onPress={() => router.navigate({ pathname: "/report", params: { date: shown } })}
                  hitSlop={6}
                  className="min-h-9 justify-center rounded-full bg-purple-tint px-3 active:opacity-80"
                >
                  <Text className="font-strong text-xs text-purple-ink">گزارش</Text>
                </Pressable>
              </View>
            </View>
            <Ring value={data.day.totals.kcal} goal={data.day.goals.kcal}>
              <Text className="font-heavy text-[34px] leading-[44px]">{faInt(Math.abs(data.day.remaining.kcal))}</Text>
              <Text className="text-xs text-ink-2">{data.day.remaining.kcal >= 0 ? "کالری مانده" : "کالری بیشتر از هدف"}</Text>
            </Ring>
            <View className="w-full flex-row gap-4">
              <Macro label="پروتئین" value={data.day.totals.protein_g} goal={data.day.goals.protein_g} bar="bg-purple" ink="text-purple-ink" />
              <Macro label="کربو" value={data.day.totals.carbs_g} goal={data.day.goals.carbs_g} bar="bg-carbs" ink="text-carbs" />
              <Macro label="چربی" value={data.day.totals.fat_g} goal={data.day.goals.fat_g} bar="bg-fat" ink="text-fat-ink" />
            </View>
            {data.day.streak > 1 && isToday && <Text className="text-xs text-green-ink">زنجیره {faInt(data.day.streak)} روزه</Text>}
            {/* Shown for context only: activity is not added to the calorie goal. */}
            {actParts.length > 0 && (
              <View accessible accessibilityLabel={`از ${HEALTH_NAME}: ${actParts.join("، ")}`} className="flex-row items-center gap-1.5">
                <Footprints color={ink2} size={14} />
                <Text className="text-xs text-ink-2">{actParts.join(" · ")} · از {HEALTH_NAME}</Text>
              </View>
            )}
          </View>

          {line && <NutiSays mood={line.mood} text={line.text} />}

          {/* «حالت شیطان»: today only; reloads when the day's totals change, since the story fits the moment. */}
          {isToday && nakhonakOn && <NakhonakCard dayKey={`${shown}:${Math.round(data.day.totals.kcal)}:${data.items.length}`} />}

          {/* Repeats are logged "now", so they only make sense on today. */}
          {isToday && <QuickRepeats repeats={data.day.repeats} />}

          <Button
            label={isToday ? "ثبت وعده" : `ثبت وعده برای ${faDayWord(shown, today)}`}
            onPress={() => router.push(isToday ? "/log" : { pathname: "/log", params: { date: shown } })}
          />

          {data.items.length ? (
            <View className="gap-3">
              {MEALS.map(({ v, l }) => {
                const list = data.items.filter((i) => i.meal_type === v);
                if (!list.length) return null;
                const kcal = list.reduce((s, i) => s + i.kcal, 0);
                return (
                  <View key={v} className="gap-1 rounded-card border border-line bg-surface p-4">
                    <View className="mb-1 flex-row justify-between">
                      <Text accessibilityRole="header" className="font-strong text-[15px]">{l}</Text>
                      <Text className="text-sm text-ink-2">{faInt(kcal)} کالری</Text>
                    </View>
                    {list.map((it) => (
                      <ItemRow key={it.id} it={it} />
                    ))}
                  </View>
                );
              })}
              <Text className="text-center text-xs text-ink-2">برای ویرایش یا حذف، روی هر غذا بزن.</Text>
            </View>
          ) : (
            !isToday && (
              <View className="rounded-card bg-track p-4">
                {/* ink-2 on track is about 4.3:1, below AA for small text; full ink passes. */}
                <Text className="text-sm leading-6 text-ink">برای این روز چیزی ثبت نشده.</Text>
              </View>
            )
          )}
        </View>
      )}
      <View className="h-4" />
    </Screen>
  );
}
