import type { DraftView } from "@nutivo/core";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react-native";
import { ActivityIndicator, Alert, Image, Linking, Pressable, TextInput, View } from "react-native";
import { useCSSVariable } from "uniwind";
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

/** Why «ثبت» is off, named, instead of one generic instruction on the disabled button. */
function notReadyHint(d: DraftView): string | null {
  if (d.ready || !d.items.length) return null;
  const missing = d.items.find((it) => !it.food);
  if (missing) return `«${missing.said}» در فهرست غذاها پیدا نشد؛ حذفش کن یا دوباره با اسم دیگری بنویس.`;
  const noGrams = d.items.filter((it) => it.food && (it.grams == null || it.question)).length;
  return noGrams ? `وزن ${toPersianDigits(noGrams)} آیتم علامت‌دار را وارد کن.` : null;
}

const DENIED = "دسترسی داده نشد. از تنظیمات گوشی اجازه را بده یا متن بنویس.";
/** Reading a photo usually takes 10–20 s; past this the request is dropped and the user can retry. */
const READ_TIMEOUT_MS = 60_000;

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
  const [denied, setDenied] = useState(false);
  const ink2 = useCSSVariable("--color-ink-2") as string;
  // Set once the meal is saved or the user chose to discard it; the sheet then closes without asking.
  const [leaving, setLeaving] = useState(false);
  const [closeAfterSave, setCloseAfterSave] = useState(false);
  const reading = useRef<AbortController | null>(null);
  const cancelled = useRef(false);
  const navigation = useNavigation();

  // Closing the sheet in any way (×, Android back, swipe down) asks first when something would be lost.
  const dirty = !leaving && (text.trim() !== "" || photo !== null || draft !== null || phase === "reading");
  usePreventRemove(dirty, ({ data }) => {
    Alert.alert("این وعده ثبت نشده", "اگر الان بروی، چیزی ذخیره نمی‌شود.", [
      { text: "ادامه ثبت", style: "cancel" },
      {
        text: "دور بریز",
        style: "destructive",
        onPress: () => {
          discard();
          setLeaving(true);
          navigation.dispatch(data.action);
        },
      },
    ]);
  });
  // After a save the guard is off; close on the next render so it doesn't ask.
  useEffect(() => {
    if (closeAfterSave && router.canGoBack()) router.back();
  }, [closeAfterSave]);

  /** Stop a read in flight and drop the server draft, so nothing is left half-open. */
  function discard() {
    reading.current?.abort();
    if (draft) void api.draftCancel(draft.id);
  }

  async function choose(from: "camera" | "library") {
    setError(null);
    const r = await pickPhoto(from);
    if (r.ok) setPhoto(r.photo);
    else if (r.reason === "denied") {
      setError(DENIED);
      setDenied(true);
    }
    else if (r.reason === "failed") setError("عکس خوانده نشد. یک عکس دیگر امتحان کن.");
  }

  async function read() {
    if (!text.trim() && !photo) return setError("بنویس چه خوردی یا یک عکس بگذار.");
    setError(null);
    setPhase("reading");
    cancelled.current = false;
    const ctrl = new AbortController();
    reading.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), READ_TIMEOUT_MS);
    const r = await api.draft(
      {
        text: text.trim() || undefined,
        photo: photo ? { base64: photo.base64, mediaType: photo.mediaType } : undefined,
        now: date ? atTimeOn(date) : undefined,
      },
      ctrl.signal,
    );
    clearTimeout(timer);
    reading.current = null;
    if (ctrl.signal.aborted) {
      // Cancelled by the user or timed out. A draft the server made meanwhile is dropped.
      if (r.ok) void api.draftCancel(r.data.id);
      setPhase("input");
      return setError(cancelled.current ? null : "طول کشید. دوباره امتحان کن یا متن کوتاه‌تری بنویس.");
    }
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
    setLeaving(true);
    setCloseAfterSave(true);
  }

  // × goes through the same guard as Android back and swipe-down.
  const close = () => router.back();

  function cancelReading() {
    cancelled.current = true;
    reading.current?.abort();
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <View>
          <Text accessibilityRole="header" className="font-heavy text-[22px] leading-[34px]">{phase === "review" ? "همین‌ها بود؟" : "چه خوردی؟"}</Text>
          {date && <Text className="text-xs text-ink-2">برای {faDayWord(date, localToday())}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="بستن" onPress={close} className="size-11 items-center justify-center rounded-full active:bg-track">
          <X color={ink2} size={22} />
        </Pressable>
      </View>

      {photo && (
        <View>
          <Image source={{ uri: photo.uri }} accessibilityLabel="عکس وعده" className={`w-full rounded-card ${phase === "review" ? "h-32" : "aspect-[4/3]"}`} resizeMode="cover" />
          {phase === "input" && (
            <Pressable accessibilityRole="button" onPress={() => setPhoto(null)} className="absolute end-2 top-2 min-h-11 justify-center rounded-full bg-ink/70 px-4">
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
          {denied && (
            <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} className="min-h-11 justify-center self-start active:opacity-70">
              <Text className="font-strong text-sm text-green-ink">باز کردن تنظیمات</Text>
            </Pressable>
          )}
          <Button label="پیدا کردن غذاها" disabled={!text.trim() && !photo} onPress={read} />
          <Text className="text-xs leading-6 text-ink-2">عددها از جدول غذاها حساب می‌شوند، نه از هوش مصنوعی. قبل از ثبت همه را می‌بینی و می‌توانی عوض کنی.</Text>
        </View>
      )}

      {phase === "reading" && (
        <View accessibilityLiveRegion="polite" className="items-center gap-3 rounded-card bg-mint p-6">
          <ActivityIndicator colorClassName="accent-green-ink" />
          <Text className="text-[15px] text-green-ink">{photo ? "در حال نگاه کردن به عکس…" : "در حال پیدا کردن غذاها…"}</Text>
          <Pressable accessibilityRole="button" onPress={cancelReading} className="min-h-11 justify-center rounded-btn px-4 active:bg-surface">
            <Text className="font-strong text-sm text-green-ink">لغو</Text>
          </Pressable>
        </View>
      )}

      {phase === "review" && draft && (
        <View className="gap-4">
          {text.trim() !== "" && <Text className="rounded-btn bg-track px-3 py-2 text-sm text-ink">«{text.trim()}»</Text>}
          <DraftCard draft={draft} busy={busy} onChange={change} />
          {draft.estimated && <Text className="text-xs leading-6 text-ink-2">مقدارهایی که با ≈ آمده‌اند تخمینی‌اند؛ اگر مقدار را می‌دانی، درستش کن.</Text>}
          {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}
          {notReadyHint(draft) && <Text className="text-sm leading-6 text-fat-ink">{notReadyHint(draft)}</Text>}
          <Button
            label={`ثبت ${mealLabel(draft.meal_type)}`}
            busyLabel="در حال ثبت…"
            busy={busy}
            disabled={!draft.ready || draft.items.length === 0}
            onPress={confirm}
          />
          <Button variant="quiet" label="ویرایش متن" disabled={busy} onPress={() => {
            void api.draftCancel(draft.id);
            setDraft(null);
            setPhase("input");
          }} />
        </View>
      )}
    </Screen>
  );
}
