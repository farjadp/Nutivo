import { Bell, FileText, Minus, Plus } from "lucide-react-native";
import { Fragment, useState } from "react";
import { Alert, Linking, Pressable, Switch, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { hhmm, REMINDER_KEYS, type ReminderKey } from "@/lib/reminders";
import { useReminders } from "@/lib/reminders-provider";
import { Text } from "@/ui/text";

const LABEL: Record<ReminderKey, string> = { breakfast: "صبحانه", lunch: "ناهار", dinner: "شام", report: "گزارش شبانه" };
const STEP = 30;

/** «من» rows: one switch per reminder, and its time (in half hours) once it is on. */
export function ReminderRows() {
  const { prefs, update, shift } = useReminders();
  const [green, ink2, track] = useCSSVariable(["--color-green-ink", "--color-ink-2", "--color-track"]) as string[];
  const [blocked, setBlocked] = useState(false);

  async function toggle(key: ReminderKey, on: boolean) {
    let r: "ok" | "denied";
    try {
      r = await update(key, { on });
    } catch (e) {
      return Alert.alert("یادآوری تنظیم نشد", e instanceof Error ? e.message : String(e), [{ text: "باشه" }]);
    }
    if (r === "ok") setBlocked(false);
    if (r === "denied") {
      setBlocked(true);
      Alert.alert("اعلان‌ها خاموش است", "برای یادآوری، اعلان‌های Nutivo را در تنظیمات گوشی روشن کن.", [
        { text: "بعداً", style: "cancel" },
        { text: "باز کردن تنظیمات", onPress: () => void Linking.openSettings() },
      ]);
    }
  }

  return (
    <>
      {REMINDER_KEYS.map((key, i) => {
        const p = prefs[key];
        const Icon = key === "report" ? FileText : Bell;
        const move = (by: number) => void shift(key, by);
        return (
          <Fragment key={key}>
            {i > 0 && <View className="ms-14 h-px bg-line" />}
            <View className="gap-2 px-4 py-3">
              {/* The whole row is the switch, as with نوتی. */}
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel={`یادآوری ${LABEL[key]}`}
                accessibilityHint={p.on ? `ساعت ${hhmm(p.minutes)}` : undefined}
                accessibilityState={{ checked: p.on }}
                onPress={() => void toggle(key, !p.on)}
                className="min-h-11 flex-row items-center gap-3 active:opacity-80"
              >
                <Icon color={green} size={20} />
                <View className="flex-1">
                  <Text className="text-[15px]">{LABEL[key]}</Text>
                  <Text className="text-xs text-ink-2">
                    {p.on ? (key === "report" ? `هر شب ${hhmm(p.minutes)}` : `${hhmm(p.minutes)}، اگر هنوز ثبت نکرده باشی`) : "خاموش"}
                  </Text>
                </View>
                <Switch importantForAccessibility="no-hide-descendants" accessibilityElementsHidden value={p.on} onValueChange={(v) => void toggle(key, v)} trackColor={{ true: green, false: track }} />
              </Pressable>
              {p.on && (
                <View className="ms-8 flex-row items-center self-start overflow-hidden rounded-btn border border-line">
                  <Pressable accessibilityRole="button" accessibilityLabel={`نیم ساعت زودتر: ${LABEL[key]}`} onPress={() => move(-STEP)} className="size-11 items-center justify-center active:bg-track">
                    <Minus color={ink2} size={18} />
                  </Pressable>
                  <Text accessibilityLiveRegion="polite" className="min-w-16 text-center text-[15px]">{hhmm(p.minutes)}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`نیم ساعت دیرتر: ${LABEL[key]}`} onPress={() => move(STEP)} className="size-11 items-center justify-center active:bg-track">
                    <Plus color={ink2} size={18} />
                  </Pressable>
                </View>
              )}
            </View>
          </Fragment>
        );
      })}
      {blocked && (
        <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} className="min-h-11 justify-center border-t border-line px-4 active:opacity-70">
          <Text className="font-strong text-sm text-green-ink">اعلان‌ها در تنظیمات گوشی خاموش است. باز کردن تنظیمات</Text>
        </Pressable>
      )}
    </>
  );
}
