import type { DraftView } from "@nutivo/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, TextInput, View } from "react-native";
import { api, type DraftChange } from "@/lib/api";
import { atTimeOn, faDayWord, localToday } from "@/lib/format";
import { mealLabel } from "@/lib/meals";
import { pickPhoto, type PickedPhoto } from "@/lib/photo";
import { useUndo } from "@/lib/undo";
import { DraftCard } from "@/features/log/draft-card";
import { Button } from "@/ui/button";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";
import { toPersianDigits } from "@nutivo/core";

const DENIED = "دسترسی داده نشد. از تنظیمات گوشی اجازه را بده یا متن بنویس.";

export default function Log() {
  const { saved } = useUndo();
  // Set when logging to a past day from the day strip.
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [draft, setDraft] = useState<DraftView | null>(null);
  const [phase, setPhase] = useState<"input" | "reading" | "review">("input");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(from: "camera" | "library") {
    setError(null);
    const r = await pickPhoto(from);
    if (r.ok) setPhoto(r.photo);
    else if (r.reason === "denied") setError(DENIED);
    else if (r.reason === "failed") setError("عکس خوانده نشد. یک عکس دیگر امتحان کن.");
  }

  async function read() {
    if (!text.trim() && !photo) return setError("بنویس چه خوردی یا یک عکس بگذار.");
    setError(null);
    setPhase("reading");
    const r = await api.draft({
      text: text.trim() || undefined,
      photo: photo ? { base64: photo.base64, mediaType: photo.mediaType } : undefined,
      now: date ? atTimeOn(date) : undefined,
    });
    if (!r.ok) {
      setPhase("input");
      return setError(r.error);
    }
    setDraft(r.data);
    setPhase("review");
  }

  async function change(c: DraftChange) {
    if (!draft) return;
    setBusy(true);
    const r = await api.draftEdit(draft.id, c);
    setBusy(false);
    if (r.ok) {
      setDraft(r.data);
      setError(null);
    } else setError(r.error);
  }

  async function confirm() {
    if (!draft) return;
    setBusy(true);
    const r = await api.draftConfirm(draft.id);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    saved({ entryId: r.data.entry_id, label: `${mealLabel(draft.meal_type)} · ${toPersianDigits(Math.round(draft.totals.kcal))} کالری` });
    router.back();
  }

  async function close() {
    if (draft) void api.draftCancel(draft.id);
    router.back();
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="font-heavy text-[22px] leading-[34px]">{phase === "review" ? "درست فهمیدم؟" : "چی خوردی؟"}</Text>
          {date && <Text className="text-xs text-ink-2">برای {faDayWord(date, localToday())}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="بستن" onPress={close} className="size-10 items-center justify-center rounded-full active:bg-track">
          <Text className="text-xl text-ink-2">×</Text>
        </Pressable>
      </View>

      {photo && (
        <View>
          <Image source={{ uri: photo.uri }} accessibilityLabel="عکس وعده" className={`w-full rounded-card ${phase === "review" ? "h-32" : "aspect-[4/3]"}`} resizeMode="cover" />
          {phase === "input" && (
            <Pressable accessibilityRole="button" onPress={() => setPhoto(null)} className="absolute end-2 top-2 rounded-full bg-ink/70 px-3 py-1.5">
              <Text className="text-xs text-ground">حذف عکس</Text>
            </Pressable>
          )}
        </View>
      )}

      {phase === "input" && (
        <View className="gap-3">
          <TextInput
            accessibilityLabel="شرح وعده"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={600}
            placeholder={photo ? "توضیح اضافه، اختیاری: مثلاً «نصف بشقاب» یا «با روغن کم»" : "مثلاً: یک بشقاب چلو خورش قورمه‌سبزی و یک کاسه ماست"}
            placeholderTextColorClassName="accent-ink-2"
            cursorColorClassName="accent-green-ink"
            textAlignVertical="top"
            className="font-body min-h-28 rounded-card border border-line bg-surface p-3 text-right text-[15px] leading-7 text-ink"
          />
          <View className="flex-row gap-2">
            <Button className="flex-1" variant="quiet" label="عکس بگیر" onPress={() => choose("camera")} />
            <Button className="flex-1" variant="quiet" label="از گالری" onPress={() => choose("library")} />
          </View>
          {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}
          <Button label="بررسی" disabled={!text.trim() && !photo} onPress={read} />
          <Text className="text-xs leading-6 text-ink-2">عددها از جدول غذاها حساب می‌شوند، نه از هوش مصنوعی. قبل از ثبت همه را می‌بینی و می‌توانی عوض کنی.</Text>
        </View>
      )}

      {phase === "reading" && (
        <View accessibilityLiveRegion="polite" className="items-center gap-3 rounded-card bg-mint p-6">
          <ActivityIndicator colorClassName="accent-green-ink" />
          <Text className="text-[15px] text-green-ink">{photo ? "دارم عکس را نگاه می‌کنم…" : "دارم غذاها را پیدا می‌کنم…"}</Text>
        </View>
      )}

      {phase === "review" && draft && (
        <View className="gap-4">
          {text.trim() !== "" && <Text className="rounded-btn bg-track px-3 py-2 text-sm text-ink-2">«{text.trim()}»</Text>}
          <DraftCard draft={draft} busy={busy} onChange={change} />
          {draft.estimated && <Text className="text-xs leading-6 text-ink-2">آیتم‌های خط‌چین از روی عکس تخمین زده شده‌اند؛ اگر مقدار را می‌دانی، درستش کن.</Text>}
          {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}
          <Button
            label={draft.ready ? `ثبت ${mealLabel(draft.meal_type)}` : "اول وزن آیتم‌های علامت‌دار را کامل کن"}
            busyLabel="در حال ثبت…"
            busy={busy}
            disabled={!draft.ready || draft.items.length === 0}
            onPress={confirm}
          />
          <Button variant="quiet" label="از اول" disabled={busy} onPress={() => {
            void api.draftCancel(draft.id);
            setDraft(null);
            setPhase("input");
          }} />
        </View>
      )}
    </Screen>
  );
}
