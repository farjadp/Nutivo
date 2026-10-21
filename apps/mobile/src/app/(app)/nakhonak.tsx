import { NAKHONAK_LINES } from "@nutivo/core";
import { useFocusEffect } from "expo-router";
import { Lock } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { useNakhonak } from "@/features/nakhonak/use-nakhonak";
import { faInt } from "@/lib/format";
import { BackHeader } from "@/ui/back-header";
import { Button } from "@/ui/button";
import { Nakhonak } from "@/ui/nakhonak";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

/** «پرونده‌ی ناخنک»: the switch, the rules, the score, the traps the user has caught, and the chapter. */
export default function NakhonakScreen() {
  const { state, error, busy, load, setEnabled } = useNakhonak();
  const [purple, track, ink2] = useCSSVariable(["--color-purple", "--color-track", "--color-ink-2"]) as string[];
  const [said, setSaid] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggle = async (on: boolean) => {
    const err = await setEnabled(on);
    if (err) Alert.alert("ذخیره نشد", err, [{ text: "باشه" }]);
    else setSaid(on ? NAKHONAK_LINES.enabled : NAKHONAK_LINES.disabled);
  };

  const on = state?.enabled ?? false;
  const p = state?.progress;
  const toNext = p?.nextRank ? Math.min(100, Math.round((p.score / p.nextRank.at) * 100)) : 100;

  return (
    <Screen>
      <BackHeader title="پرونده‌ی ناخنک" />

      {!state && !error && (
        <View className="items-center py-16">
          <ActivityIndicator colorClassName="accent-purple" />
        </View>
      )}
      {error && !state && (
        <View className="gap-3 rounded-card bg-surface p-4">
          <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>
          <Button label="دوباره" variant="quiet" onPress={() => void load()} />
        </View>
      )}

      {state && p && (
        <>
          <View className="items-center gap-3 rounded-card bg-night p-5">
            <View className="rounded-full bg-on-night/20 p-3">
              <Nakhonak mood={on ? (said === NAKHONAK_LINES.enabled ? "smug" : "sly") : "gentle"} size={124} />
            </View>
            <Text className="font-heavy text-[20px] leading-8 text-on-night">ناخنک، عیارِ هزار و یک بهونه</Text>
            <Text className="text-center text-sm leading-7 text-on-night/85">{said ?? NAKHONAK_LINES.intro}</Text>
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="حالت شیطان"
            accessibilityState={{ checked: on, busy: busy === "toggle" }}
            disabled={busy === "toggle"}
            onPress={() => void toggle(!on)}
            className="min-h-14 flex-row items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 active:bg-track"
          >
            <View className="flex-1">
              <Text className="font-strong text-[15px]">حالت شیطان</Text>
              <Text className="text-xs leading-5 text-ink-2">
                {on ? "روزی یه قصه، روی صفحه‌ی امروز و در تلگرام (ساعت ۸ شب)." : "خاموش. ناخنک هیچ پیامی نمی‌فرسته."}
              </Text>
            </View>
            <Switch
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              value={on}
              disabled={busy === "toggle"}
              onValueChange={(v) => void toggle(v)}
              trackColor={{ true: purple, false: track }}
            />
          </Pressable>

          <View className="gap-2 rounded-card bg-purple-tint p-4">
            <Text accessibilityRole="header" className="font-strong text-sm text-purple-ink">قانون بازی</Text>
            {[
              "هر قصه یه جاش لنگ می‌زنه. پیداش کنی، بردی.",
              "بردن یعنی تصمیم آگاهانه، نه نخوردن. گرسنه‌ای، بخور.",
              "اگه خوردی و ثبتش کردی، صادق بودی. اینم امتیاز داره.",
              "روزی فقط یه قصه. نوروز و یلدا آتش‌بسه.",
              "هر وقت خواستی خاموشش کن. ناخنک دلخور نمی‌شه، زیاد.",
            ].map((l) => (
              <Text key={l} className="text-sm leading-7 text-purple-ink">• {l}</Text>
            ))}
          </View>

          <View className="gap-3 rounded-card border border-line bg-surface p-4">
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-xs text-ink-2">لقب تو</Text>
                <Text accessibilityRole="header" className="font-heavy text-[20px] leading-8 text-purple-ink">{p.rank}</Text>
              </View>
              <View className="items-end">
                <Text className="font-heavy text-[20px] leading-8">{faInt(p.score)}</Text>
                <Text className="text-xs text-ink-2">امتیاز، {faInt(p.playedDays)} روز بازی</Text>
              </View>
            </View>
            {p.nextRank && (
              <View
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`تا لقب ${p.nextRank.title}`}
                accessibilityValue={{ min: 0, max: p.nextRank.at, now: p.score }}
                className="gap-1.5"
              >
                <View className="h-2 overflow-hidden rounded-full bg-track">
                  {/* Width is data, so it cannot be a class. */}
                  <View className="h-2 rounded-full bg-purple" style={{ width: `${toNext}%` }} />
                </View>
                <Text className="text-xs text-ink-2">تا «{p.nextRank.title}»: {faInt(p.nextRank.at - p.score)} امتیاز دیگه</Text>
              </View>
            )}
          </View>

          <View className="gap-2">
            <Text accessibilityRole="header" className="px-1 text-xs text-ink-2">ترفندهای ناخنک</Text>
            <View className="overflow-hidden rounded-card border border-line bg-surface">
              {p.traps.map((t, i) => (
                <View key={t.id} accessible className={`gap-1 px-4 py-3 ${i ? "border-t border-line" : ""}`}>
                  <View className="flex-row items-center justify-between gap-2">
                    <View className="flex-row items-center gap-2">
                      {!t.found && <Lock color={ink2} size={14} />}
                      <Text className={`font-strong text-[15px] ${t.found ? "" : "text-ink-2"}`}>{t.name}</Text>
                    </View>
                    <View accessibilityLabel={`${faInt(Math.min(t.found, 3))} از ۳ بار کشف`} className="flex-row gap-1">
                      {[0, 1, 2].map((d) => (
                        <View key={d} className={`size-2.5 rounded-full ${d < t.found ? "bg-purple" : "bg-track"}`} />
                      ))}
                    </View>
                  </View>
                  <Text className="text-sm leading-6 text-ink-2">
                    {t.found ? t.explain : "هنوز این ترفند رو گیر ننداختی."}
                    {t.mastered ? " · استادش شدی." : ""}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-2 rounded-card border border-line bg-surface p-4">
            <View className="flex-row items-center gap-2">
              {!p.chapter.unlocked && <Lock color={ink2} size={14} />}
              <Text accessibilityRole="header" className="font-strong text-[15px]">{p.chapter.title}</Text>
            </View>
            {p.chapter.unlocked ? (
              <Text className="text-sm leading-7">{p.chapter.text}</Text>
            ) : (
              <Text className="text-sm leading-6 text-ink-2">
                ناخنک یه قصه‌ی راست هم داره، درباره‌ی خودش و نوتی. {faInt(p.chapter.daysLeft)} روز بازی دیگه.
              </Text>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}
