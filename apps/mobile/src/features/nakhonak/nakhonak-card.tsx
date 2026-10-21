import type { AppNakhonakToday } from "@nutivo/core";
import { router, useFocusEffect } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { faInt } from "@/lib/format";
import { useReduceMotion } from "@/lib/motion";
import { Nakhonak } from "@/ui/nakhonak";
import { Nuti } from "@/ui/nuti";
import { Text } from "@/ui/text";
import { useNakhonak } from "./use-nakhonak";

/**
 * ناخنک on «امروز»: today's story with three answers and «امروز حوصله ندارم», then his reply.
 * A deep plum card (night / on-night tokens, the same in spirit in both themes): the night-time voice
 * next to نوتی's light bubble.
 */
export function NakhonakCard({ dayKey }: { dayKey: string }) {
  const { state, error, busy, load, answer } = useNakhonak();
  // Reload when the day changes (the story fits the moment) and when the screen comes back (answered in Telegram).
  useEffect(() => {
    void load();
  }, [load, dayKey]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const today = state?.today;
  if (!state?.enabled || !today) {
    return error ? <Text className="text-center text-xs text-ink-2">ناخنک امروز نیومد: {error}</Text> : null;
  }
  return (
    <View accessibilityLabel="حالت شیطان، ناخنک" className="gap-4 rounded-card bg-night p-4">
      <Header today={today} />
      {today.kind === "truce" || today.kind === "paused" ? (
        <Text className="text-[15px] leading-7 text-on-night">{today.text}</Text>
      ) : today.result ? (
        <Result today={today} />
      ) : (
        <Story today={today} busy={busy} onAnswer={(c) => void answer(c)} />
      )}
      {error && <Text accessibilityRole="alert" className="text-xs text-on-night">{error}</Text>}
      <Pressable accessibilityRole="link" onPress={() => router.push("/nakhonak")} hitSlop={6} className="min-h-9 flex-row items-center gap-1 self-start active:opacity-70">
        <Text className="font-strong text-xs text-on-night">پرونده‌ی ناخنک</Text>
        <Chevron />
      </Pressable>
    </View>
  );
}

function Chevron() {
  const ground = useCSSVariable("--color-on-night") as string;
  return <ChevronLeft color={ground} size={14} />;
}

function Header({ today }: { today: AppNakhonakToday }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="rounded-full bg-on-night/20 p-1.5">
        <Nakhonak mood={today.mood} size={76} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-xs text-on-night/80">ناخنک · عیارِ هزار و یک بهونه</Text>
        <Text accessibilityRole="header" className="font-heavy text-[18px] leading-8 text-on-night">
          {today.kind === "truce" ? "آتش‌بس" : today.kind === "paused" ? "کنار کشیده" : today.story?.title}
        </Text>
      </View>
    </View>
  );
}

function Story({ today, busy, onAnswer }: { today: AppNakhonakToday; busy: string | null; onAnswer: (choice: string) => void }) {
  const story = today.story!;
  return (
    <View className="gap-3">
      {today.intro && <Text className="text-sm leading-7 text-on-night/85">{today.intro}</Text>}
      <Text className="text-[15px] leading-8 text-on-night">{story.text}</Text>
      <View accessibilityRole="radiogroup" className="gap-2">
        {story.choices.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityState={{ disabled: Boolean(busy), busy: busy === c.id }}
            disabled={Boolean(busy)}
            onPress={() => onAnswer(c.id)}
            className={`min-h-12 flex-row items-center gap-2 rounded-btn border border-on-night/35 bg-on-night/10 px-3 py-2.5 active:bg-on-night/25 ${busy && busy !== c.id ? "opacity-60" : ""}`}
          >
            {busy === c.id && <ActivityIndicator size="small" colorClassName="accent-on-night" />}
            <Text className="flex-1 text-sm leading-6 text-on-night">{c.label}</Text>
          </Pressable>
        ))}
      </View>
      {story.skipLabel && (
        <Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={() => onAnswer("x")} hitSlop={6} className="min-h-9 justify-center self-center active:opacity-70">
          <Text className="text-xs text-on-night/85 underline">{story.skipLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Result({ today }: { today: AppNakhonakToday }) {
  const r = today.result!;
  const reduce = useReduceMotion();
  const show = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return show.setValue(1);
    Animated.timing(show, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reduce, show]);

  const picked = r.outcome === "skip" ? today.story?.skipLabel : today.story?.choices.find((c) => c.id === r.choice)?.label;
  const badge = r.retract ? "مساوی" : r.outcome === "spot" ? "بردی" : r.outcome === "fall" ? "ناخنک برد" : r.outcome === "skip" ? null : "صادقانه";
  return (
    <Animated.View
      className="gap-3"
      style={{ opacity: show, transform: [{ translateY: show.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}
    >
      {picked && today.kind === "story" && <Text className="text-sm leading-7 text-on-night/80">«{picked}»</Text>}
      {r.nuti && (
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-on-night p-0.5">
            <Nuti mood="think" size={30} />
          </View>
          <Text className="flex-1 text-sm leading-7 text-on-night">
            <Text className="font-strong text-sm text-on-night">نوتی: </Text>
            {r.nuti}
          </Text>
        </View>
      )}
      <Text className="text-[15px] leading-8 text-on-night">{r.reply}</Text>
      {r.extra && <Text className="text-sm leading-7 text-on-night/85">{r.extra}</Text>}
      {today.aside?.map((l, i) => (
        <Text key={i} className="text-sm leading-7 text-on-night">
          <Text className="font-strong text-sm text-on-night">{l.who === "nuti" ? "نوتی: " : "ناخنک: "}</Text>
          {l.text}
        </Text>
      ))}
      <View className="flex-row flex-wrap items-center gap-2">
        {badge && (
          <View className="rounded-full bg-on-night px-3 py-1">
            <Text className="font-strong text-xs text-night">
              {badge}
              {r.points > 0 ? `، ${faInt(r.points)} امتیاز` : ""}
            </Text>
          </View>
        )}
        {r.logPrompt && (
          <Pressable accessibilityRole="button" onPress={() => router.push("/log")} className="min-h-9 justify-center rounded-full border border-on-night/50 px-3 active:opacity-70">
            <Text className="font-strong text-xs text-on-night">ثبتش کن</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
