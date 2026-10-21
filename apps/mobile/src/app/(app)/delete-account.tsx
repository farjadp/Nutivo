import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { BackHeader } from "@/ui/back-header";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

const WORD = "حذف";

/** Permanent account deletion (App Store 5.1.1(v)). The user types «حذف» so it can't happen by one stray tap. */
export default function DeleteAccount() {
  const { me, signOut } = useSession();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = typed.trim() === WORD;

  async function remove() {
    setBusy(true);
    setError(null);
    const r = await api.deleteAccount();
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    await signOut();
    Alert.alert("حسابت حذف شد", "همه وعده‌ها، گزارش‌ها و عکس‌هایت پاک شد. هر وقت خواستی با یک ایمیل دوباره شروع کن.", [{ text: "باشه" }]);
  }

  return (
    <Screen>
      <BackHeader title="حذف حساب" />
      <View className="gap-3 rounded-card border border-line bg-surface p-4">
        <Text className="font-strong text-base">این کار برگشت ندارد</Text>
        <Text className="text-[15px] leading-7 text-ink-2">
          حساب {me?.email ?? "تو"} و هر چه در آن است برای همیشه پاک می‌شود: وعده‌ها، عکس غذاها، گزارش‌ها، پروفایل و هدف‌ها، و اتصال بات تلگرام.
        </Text>
      </View>

      <Field label={`برای تأیید، بنویس «${WORD}»`} value={typed} onChangeText={setTyped} autoCorrect={false} autoCapitalize="none" />
      {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}

      <View className="gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready || busy, busy }}
          disabled={!ready || busy}
          onPress={() => void remove()}
          className={`h-12 items-center justify-center rounded-btn bg-error active:opacity-80 ${!ready || busy ? "opacity-40" : ""}`}
        >
          <Text className="font-strong text-[15px] text-on-green">{busy ? "در حال حذف…" : "حذف همیشگی حساب"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.back()} className="min-h-11 items-center justify-center active:opacity-70">
          <Text className="text-[15px] text-green-ink">نه، برگرد</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
