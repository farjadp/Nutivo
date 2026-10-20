import { toLatinDigits } from "@nutivo/core";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { Button } from "@/ui/button";
import { Field } from "@/ui/field";
import { Logo } from "@/ui/logo";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = email.trim().toLowerCase();

  async function send() {
    // A Persian keyboard turns "you@example.com" into Persian letters; say so instead of "invalid".
    if (/[\u0600-\u06FF]/.test(clean)) return setError("ایمیل را با کیبورد انگلیسی بنویس.");
    if (!EMAIL.test(clean)) return setError("ایمیل معتبر نیست.");
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
    setBusy(false);
    if (e) return setError("ارسال کد انجام نشد. چند دقیقه بعد دوباره امتحان کن.");
    setStep("code");
  }

  async function verify() {
    const token = toLatinDigits(code).replace(/\D/g, "");
    if (token.length !== 6) return setError("کد شش‌رقمی را کامل وارد کن.");
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ email: clean, token, type: "email" });
    setBusy(false);
    // On success the session listener moves to onboarding or the day view.
    if (e) setError("این کد درست نیست یا منقضی شده.");
  }

  return (
    <Screen>
      <View className="mt-10 items-start gap-5">
        <Logo height={36} />
        <View className="gap-2">
          <Text className="font-heavy text-[26px] leading-[40px]">ثبت غذا، بدون دردسر</Text>
          <Text className="text-[15px] leading-7 text-ink-2">بنویس یا عکس بگیر؛ Nutivo کالری و درشت‌مغذی‌ها را با غذاهای ایرانی حساب می‌کند.</Text>
        </View>
      </View>

      {step === "email" ? (
        <View className="gap-3">
          <Field
            label="ایمیل"
            ltr
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={send}
          />
          {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}
          <Button label="ارسال کد ورود" busyLabel="در حال ارسال…" busy={busy} onPress={send} />
          <Text className="text-xs leading-6 text-ink-2">رمز عبور لازم نیست. هر بار یک کد یک‌بارمصرف به ایمیلت می‌آید.</Text>
        </View>
      ) : (
        <View className="gap-3">
          <View className="rounded-card bg-mint p-4">
            <Text className="text-[15px] leading-7">کد شش‌رقمی به {clean} فرستاده شد.</Text>
          </View>
          <Field
            label="کد ورود"
            ltr
            value={code}
            onChangeText={setCode}
            placeholder="۱۲۳۴۵۶"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={verify}
          />
          {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}
          <Button label="ورود" busyLabel="در حال بررسی…" busy={busy} onPress={verify} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="self-start py-2"
          >
            <Text className="text-sm text-green-ink">ایمیل را عوض کن</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
