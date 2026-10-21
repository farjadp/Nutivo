import { countdownFa, OTP_LENGTH, otpDigits, RESEND_SECONDS, sendErrorFa, verifyErrorFa } from "@nutivo/core";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { Button } from "@/ui/button";
import { Field } from "@/ui/field";
import { Logo } from "@/ui/logo";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Seconds until «کد را دوباره بفرست» works again, ticking once a second. */
function useCountdown(): [number, () => void] {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= now) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until, now]);
  return [
    Math.max(0, (until - now) / 1000),
    () => {
      setNow(Date.now());
      setUntil(Date.now() + RESEND_SECONDS * 1000);
    },
  ];
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [left, restart] = useCountdown();
  const clean = email.trim().toLowerCase();

  async function send(again = false) {
    // A Persian keyboard turns "you@example.com" into Persian letters; say so instead of "invalid".
    if (/[\u0600-\u06FF]/.test(clean)) return setError("ایمیل را با کیبورد انگلیسی بنویس.");
    if (!EMAIL.test(clean)) return setError("ایمیل معتبر نیست.");
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: e } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
    setBusy(false);
    if (e) return setError(sendErrorFa(e));
    restart();
    setCode("");
    setStep("code");
    if (again) setNotice("یک کد تازه فرستادیم. کد قبلی دیگر کار نمی‌کند.");
  }

  async function verify(value = code) {
    const token = otpDigits(value);
    if (token.length !== OTP_LENGTH) return setError("کد شش‌رقمی را کامل وارد کن.");
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ email: clean, token, type: "email" });
    setBusy(false);
    // On success the session listener moves to onboarding or the day view.
    if (e) setError(verifyErrorFa(e));
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
            onChangeText={(v) => {
              setEmail(v);
              setError(null);
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => void send()}
          />
          {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}
          <Button label="ارسال کد ورود" busyLabel="در حال ارسال…" busy={busy} onPress={() => void send()} />
          <Text className="text-xs leading-6 text-ink-2">رمز عبور لازم نیست. هر بار یک کد یک‌بارمصرف به ایمیلت می‌آید.</Text>
        </View>
      ) : (
        <View className="gap-3">
          <View className="rounded-card bg-mint p-4">
            <Text className="text-[15px] leading-7">کد شش‌رقمی به {clean} فرستاده شد. تا ۱۰ دقیقه معتبر است. اگر نیامد، پوشه اسپم را هم ببین.</Text>
          </View>
          <Field
            label="کد ورود"
            ltr
            value={code}
            onChangeText={(v) => {
              // Keep only digits, so a pasted «کد: ۱۲۳ ۴۵۶» still works; check as soon as all six are in.
              const d = otpDigits(v);
              setCode(d);
              setError(null);
              if (d.length === OTP_LENGTH && !busy) void verify(d);
            }}
            placeholder="۱۲۳۴۵۶"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void verify()}
          />
          {error && <Text accessibilityRole="alert" className="text-sm leading-6 text-error">{error}</Text>}
          {notice && !error && <Text accessibilityRole="alert" className="text-sm text-green-ink">{notice}</Text>}
          <Button label="ورود" busyLabel="در حال بررسی…" busy={busy} onPress={() => void verify()} />
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: left > 0 || busy }}
              disabled={left > 0 || busy}
              onPress={() => void send(true)}
              className="min-h-11 justify-center active:opacity-70"
            >
              <Text className={left > 0 ? "text-sm text-ink-2" : "font-strong text-sm text-green-ink"}>
                {left > 0 ? `ارسال دوباره تا ${countdownFa(left)}` : "کد را دوباره بفرست"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setStep("email");
                setCode("");
                setError(null);
                setNotice(null);
              }}
              className="min-h-11 justify-center active:opacity-70"
            >
              <Text className="text-sm text-green-ink">ایمیل را عوض کن</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}
