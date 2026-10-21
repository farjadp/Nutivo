import { passwordProblem, setPasswordErrorFa } from "@nutivo/core";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { BackHeader } from "@/ui/back-header";
import { Button } from "@/ui/button";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

/**
 * «من › رمز عبور»: an optional password for signing in without waiting for a code. The account was
 * just proven by a code, so Supabase lets the session set it directly.
 */
export default function PasswordScreen() {
  const { session } = useSession();
  const hasPassword = session?.user.user_metadata?.has_password === true;
  const [pw, setPw] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problem = pw ? passwordProblem(pw, repeat || undefined) : null;
  const ready = !passwordProblem(pw, repeat);

  async function save() {
    setBusy(true);
    setError(null);
    // has_password lets the app show «عوض کردن رمز» and stop suggesting one.
    const { error: e } = await supabase.auth.updateUser({ password: pw, data: { has_password: true } });
    setBusy(false);
    if (e) return setError(setPasswordErrorFa(e));
    Alert.alert("رمز ذخیره شد", "از این به بعد می‌توانی با ایمیل و رمز هم وارد شوی. ورود با کد هم مثل قبل کار می‌کند.", [
      { text: "باشه", onPress: () => router.back() },
    ]);
  }

  return (
    <Screen>
      <BackHeader title={hasPassword ? "عوض کردن رمز" : "گذاشتن رمز"} />
      <Text className="text-[15px] leading-7 text-ink-2">
        اختیاری است. با رمز، دفعه بعد بدون منتظر ماندن برای ایمیل وارد می‌شوی. اگر رمز را فراموش کنی، با کد وارد شو و از همین‌جا رمز تازه بگذار.
      </Text>
      <View className="gap-4">
        <Field
          label="رمز تازه"
          ltr
          value={pw}
          onChangeText={(v) => {
            setPw(v);
            setError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="دست‌کم ۸ کاراکتر، حرف و عدد"
        />
        <Field
          label="تکرار رمز"
          ltr
          value={repeat}
          onChangeText={(v) => {
            setRepeat(v);
            setError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={() => ready && void save()}
        />
      </View>
      {(error || problem) && (
        <Text accessibilityRole="alert" className={`text-sm ${error ? "text-error" : "text-fat-ink"}`}>
          {error ?? problem}
        </Text>
      )}
      <Button label="ذخیره رمز" busyLabel="در حال ذخیره…" busy={busy} disabled={!ready} onPress={() => void save()} />
    </Screen>
  );
}
