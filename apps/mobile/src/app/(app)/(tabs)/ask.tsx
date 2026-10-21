import { ASK_STARTERS, mealSlot, toPersianDigits, type AppAskOption, type MealType } from "@nutivo/core";
import { router } from "expo-router";
import { Check, SendHorizontal } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useCSSVariable, withUniwind } from "uniwind";
import { api } from "@/lib/api";
import { faInt } from "@/lib/format";
import { mealLabel } from "@/lib/meals";
import { useSession } from "@/lib/session";
import { useUndo } from "@/lib/undo";
import { FoodIconTile } from "@/ui/food-icon";
import { Nuti } from "@/ui/nuti";
import { Text } from "@/ui/text";

const SafeAreaView = withUniwind(RNSafeAreaView);

type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "nuti"; text: string; options: AppAskOption[]; slot?: MealType; remaining?: { kcal: number; protein_g: number } };

const qtyFa = (n: number) => toPersianDigits(+n.toFixed(2)).replace(".", "٫");
const shortName = (n: string) => n.replace(/\s*\(.*?\)/g, "");

function OptionCard({ o, slot, state, onAte }: { o: AppAskOption; slot: MealType; state?: string; onAte: () => void }) {
  // The biggest item stands for the dish (chelo and kabab shows the kabab, not a side).
  const main = [...o.items].sort((a, b) => b.grams - a.grams)[0];
  const green = useCSSVariable("--color-green-ink") as string;
  return (
    <View className="gap-2.5 rounded-card border border-line bg-surface p-3">
      <View className="flex-row items-start gap-3">
        <FoodIconTile name={main?.name ?? o.name} />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-strong text-[15px]">{o.name}</Text>
          <Text className="text-xs leading-5 text-ink-2">{o.items.map((it) => `${qtyFa(it.qty)} ${it.unit} ${shortName(it.name)}`).join("، ")}</Text>
        </View>
        <View className="items-end">
          <Text className="font-strong text-base">{faInt(o.kcal)} <Text className="text-[11px] text-ink-2">کالری</Text></Text>
          <Text className="font-strong text-[13px] text-purple-ink">{faInt(o.protein_g)} <Text className="text-[11px] text-purple-ink">گرم پروتئین</Text></Text>
        </View>
      </View>
      {o.reason !== "" && <Text className="text-[13px] leading-6 text-purple-ink">{o.reason}</Text>}
      <View className="flex-row items-center justify-between gap-2">
        {o.source === "history" ? (
          <View className="rounded-full bg-track px-2 py-0.5">
            <Text className="text-[11px] text-ink">از وعده‌های خودت</Text>
          </View>
        ) : (
          <View />
        )}
        {state === "done" ? (
          <Pressable accessibilityRole="link" onPress={() => router.navigate("/")} className="min-h-11 flex-row items-center gap-1.5 active:opacity-70">
            <Check color={green} size={16} strokeWidth={2.5} />
            <Text className="font-strong text-[13px] text-green-ink">ثبت شد · دیدن امروز</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`همین را خوردم: ${o.name}، برای ${mealLabel(slot)}`}
            accessibilityState={{ disabled: state === "saving", busy: state === "saving" }}
            disabled={state === "saving"}
            onPress={onAte}
            className="min-h-11 justify-center rounded-btn border border-green-ink px-3 active:bg-mint"
          >
            <Text className="font-strong text-[13px] text-green-ink">{state === "saving" ? "در حال ثبت…" : "همین را خوردم"}</Text>
          </Pressable>
        )}
      </View>
      {state && state !== "done" && state !== "saving" && <Text accessibilityRole="alert" className="text-xs text-error">{state}</Text>}
    </View>
  );
}

let seq = 1;

/** «بپرس»: what to eat next, from today's remaining budget. Options carry engine numbers; one tap logs them. */
export default function Ask() {
  const nutiOn = useSession().me?.nuti_enabled ?? true;
  const { saved, lastUndone } = useUndo();
  const [purple, onGreen] = useCSSVariable(["--color-purple-ink", "--color-on-green"]) as string[];
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    {
      id: 0,
      role: "nuti",
      text: nutiOn ? "سلام! بپرس چی بخوری؛ از روی امروزت یه چیز خوب برات پیدا می‌کنم." : "بپرس چه بخوری؛ از روی باقی‌مانده امروزت پیشنهاد می‌دهیم.",
      options: [],
    },
  ]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [logged, setLogged] = useState<Record<string, string>>({});
  // Card key → saved entry id, so «برگردان» on the toast turns the card back to «همین را خوردم».
  const [entries, setEntries] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!lastUndone) return;
    const key = Object.keys(entries).find((k) => entries[k] === lastUndone);
    if (key) setLogged(({ [key]: _gone, ...rest }) => rest);
  }, [lastUndone, entries]);
  const scroll = useRef<ScrollView>(null);
  const slotNow = mealSlot(new Date().getHours());

  async function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    setText("");
    setMsgs((m) => [...m, { id: seq++, role: "user", text: q }]);
    setPending(true);
    const r = await api.ask(q);
    setPending(false);
    setMsgs((m) => [
      ...m,
      r.ok
        ? { id: seq++, role: "nuti", text: r.data.reply, options: r.data.options, slot: r.data.slot, remaining: r.data.remaining }
        : { id: seq++, role: "nuti", text: r.error, options: [] },
    ]);
  }

  async function ate(msgId: number, o: AppAskOption, slot: MealType) {
    const key = `${msgId}:${o.id}`;
    setLogged((l) => ({ ...l, [key]: "saving" }));
    const r = await api.askLog(o, slot);
    setLogged((l) => ({ ...l, [key]: r.ok ? "done" : r.error }));
    if (!r.ok) return;
    setEntries((e) => ({ ...e, [key]: r.data.entry_id }));
    saved({ entryId: r.data.entry_id, label: `${mealLabel(slot)} · ${faInt(o.kcal)} کالری` });
  }

  return (
    <SafeAreaView className="flex-1 bg-ground" edges={["top"]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerClassName="gap-3 px-5 pb-4 pt-4"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          <View className="flex-row items-center gap-3">
            {nutiOn && <Nuti mood={pending ? "think" : "happy"} size={48} />}
            <View>
              <Text accessibilityRole="header" className="font-heavy text-[24px] leading-[38px]">بپرس</Text>
              <Text className="text-[13px] text-ink-2">{nutiOn ? "نوتی از روی امروزت پیشنهاد می‌ده" : "پیشنهاد بر اساس باقی‌مانده امروز"}</Text>
            </View>
          </View>

          <View accessibilityLiveRegion="polite" className="gap-3">
            {msgs.map((m) =>
              m.role === "user" ? (
                <View key={m.id} className="items-end">
                  <View className="max-w-[80%] rounded-[18px] rounded-ee-[6px] bg-green-ink px-3.5 py-2">
                    <Text className="text-[15px] leading-7 text-on-green">{m.text}</Text>
                  </View>
                </View>
              ) : (
                <View key={m.id} className="gap-2.5">
                  <View className="flex-row items-end gap-2">
                    {nutiOn && <Nuti mood={m.options.length ? "wink" : "happy"} size={32} />}
                    <View className="max-w-[85%] shrink rounded-[18px] rounded-es-[6px] bg-purple-tint px-3.5 py-2">
                      <Text className="text-[15px] leading-7">{m.text}</Text>
                    </View>
                  </View>
                  {m.remaining && m.slot && m.options.length > 0 && (
                    <Text className="text-xs text-ink-2">
                      برای {mealLabel(m.slot)} · {m.remaining.kcal > 0 ? `${faInt(m.remaining.kcal)} کالری` : "کالری امروز کامل است"}
                      {m.remaining.protein_g > 0 ? ` · ${faInt(m.remaining.protein_g)} گرم پروتئین مانده` : ""}
                    </Text>
                  )}
                  {m.slot &&
                    m.options.map((o) => (
                      <OptionCard key={o.id} o={o} slot={m.slot!} state={logged[`${m.id}:${o.id}`]} onAte={() => void ate(m.id, o, m.slot!)} />
                    ))}
                </View>
              ),
            )}
            {pending && (
              <View accessibilityLabel={nutiOn ? "نوتی دارد فکر می‌کند" : "در حال پیدا کردن پیشنهاد"} className="flex-row items-end gap-2">
                {nutiOn && <Nuti mood="think" size={32} />}
                <View className="rounded-[18px] rounded-es-[6px] bg-purple-tint px-4 py-3">
                  <ActivityIndicator size="small" color={purple} />
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View className="gap-2 border-t border-line bg-ground px-4 pb-3 pt-2.5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" keyboardShouldPersistTaps="handled">
            {ASK_STARTERS[slotNow].map((s) => (
              <Pressable
                key={s}
                accessibilityRole="button"
                disabled={pending}
                onPress={() => void ask(s)}
                className={`min-h-11 justify-center rounded-full border border-purple/30 bg-purple-tint px-3.5 active:opacity-80 ${pending ? "opacity-50" : ""}`}
              >
                <Text className="text-[13px] text-purple-ink">{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View className="flex-row items-center gap-2">
            <TextInput
              accessibilityLabel="سؤالت را بنویس"
              value={text}
              onChangeText={setText}
              placeholder="مثلاً: شام چی بخورم که پروتئینش بالا باشه؟"
              placeholderTextColorClassName="accent-ink-2"
              cursorColorClassName="accent-green-ink"
              returnKeyType="send"
              onSubmitEditing={() => void ask(text)}
              maxLength={300}
              className="font-body min-h-12 flex-1 rounded-btn border border-line bg-surface px-3 text-right text-[15px] text-ink"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="بپرس"
              accessibilityState={{ disabled: !text.trim() || pending }}
              disabled={!text.trim() || pending}
              onPress={() => void ask(text)}
              className={`size-12 items-center justify-center rounded-btn bg-green-ink active:opacity-80 ${!text.trim() || pending ? "opacity-50" : ""}`}
            >
              {/* The arrow points to the reading direction's end: left in RTL. */}
              <View className="-scale-x-100">
                <SendHorizontal color={onGreen} size={20} />
              </View>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
