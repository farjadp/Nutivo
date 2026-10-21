"use client";
import { countdownFa, OTP_LENGTH, OTP_VALID_MINUTES, otpDigits, RESEND_SECONDS } from "@nutivo/core";
import { KeyRound, Lock, Mail } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { sendCodeAction, signInWithPasswordAction, verifyCodeAction } from "./actions";
import { CodeTimer, SpamHint } from "./code-timer";

/** Seconds left of a `seconds`-long countdown, ticking once a second; the second value restarts it. */
function useCountdown(seconds: number): [number, () => void] {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= now) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [until, now]);
  return [Math.max(0, (until - now) / 1000), () => {
    setNow(Date.now());
    setUntil(Date.now() + seconds * 1000);
  }];
}

/**
 * Email, then the six-digit code from the email (the email's button is a backup that signs in this browser).
 * Someone who set a password in «من» can use the «با رمز» tab instead.
 */
export function LoginForm({ linkExpired = false }: { linkExpired?: boolean }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [mode, setMode] = useState<"code" | "password">("code");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [left, restart] = useCountdown(RESEND_SECONDS);
  // The code itself is valid for an hour (otp_expiry); shown as نوتی's countdown.
  const [valid, restartValid] = useCountdown(OTP_VALID_MINUTES * 60);
  const codeRef = useRef<HTMLInputElement>(null);

  const send = (again = false) =>
    start(async () => {
      setError(null);
      setNotice(null);
      const r = await sendCodeAction(email);
      if (!r.ok) return setError(r.error);
      restart();
      restartValid();
      setStep("code");
      setCode("");
      if (again) setNotice("یک کد تازه فرستادیم. کد قبلی دیگر کار نمی‌کند.");
      window.setTimeout(() => codeRef.current?.focus(), 0);
    });

  const verify = (value: string) =>
    start(async () => {
      setError(null);
      // On success the action redirects; anything that comes back is an error.
      const r = await verifyCodeAction(email, value);
      if (!r.ok) setError(r.error);
    });

  const signIn = () =>
    start(async () => {
      setError(null);
      // On success the action redirects; anything that comes back is an error.
      const r = await signInWithPasswordAction(email, password);
      if (!r.ok) setError(r.error);
    });

  if (step === "email") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "code") send();
          else signIn();
        }}
        className="grid gap-3"
      >
        <div role="radiogroup" aria-label="روش ورود" className="grid grid-cols-2 rounded-full bg-track p-1">
          {(
            [
              ["code", "با کد ایمیل"],
              ["password", "با رمز"],
            ] as const
          ).map(([m, l]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`min-h-10 rounded-full text-sm transition-colors ${mode === m ? "bg-surface font-semibold text-green-ink shadow-[var(--shadow-soft)]" : "text-ink"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {linkExpired && (
          <p role="alert" className="rounded-[var(--radius-btn)] bg-error/10 p-3 text-sm leading-7 text-error">
            این لینک منقضی شده یا قبلاً استفاده شده. ایمیلت را بزن تا یک کد تازه بفرستیم.
          </p>
        )}
        <label htmlFor="email" className="text-sm font-semibold">ایمیل</label>
        <div className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface px-3 focus-within:border-green">
          <Mail size={18} strokeWidth={1.75} className="text-ink-2" aria-hidden />
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="you@example.com"
            className="h-12 min-w-0 flex-1 bg-transparent text-left text-[15px] outline-none placeholder:text-ink-2"
          />
        </div>
        {mode === "password" && (
          <>
            <label htmlFor="password" className="text-sm font-semibold">رمز</label>
            <div className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface px-3 focus-within:border-green">
              <Lock size={18} strokeWidth={1.75} className="text-ink-2" aria-hidden />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                dir="ltr"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="h-12 min-w-0 flex-1 bg-transparent text-left text-[15px] outline-none"
              />
            </div>
          </>
        )}
        {error && <p role="alert" className="text-sm leading-6 text-error">{error}</p>}
        <button type="submit" disabled={pending} className="h-12 rounded-[var(--radius-btn)] bg-green-ink text-[15px] font-semibold text-surface transition-opacity duration-150 disabled:opacity-60">
          {mode === "code" ? (pending ? "در حال ارسال…" : "ارسال کد ورود") : pending ? "در حال ورود…" : "ورود"}
        </button>
        {mode === "code" ? (
          <p className="text-xs leading-6 text-ink-2">رمز لازم نیست. یک کد یک‌بارمصرف به ایمیلت می‌آید. بعد از ورود می‌توانی رمز هم بگذاری.</p>
        ) : (
          <button type="button" onClick={() => setMode("code")} className="min-h-10 justify-self-start text-sm text-green-ink hover:underline">
            رمز را فراموش کردی؟ با کد وارد شو
          </button>
        )}
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        verify(code);
      }}
      className="grid gap-3"
    >
      <CodeTimer secondsLeft={valid} />
      <p role="status" className="text-center text-[15px] leading-7">
        کد شش‌رقمی به <bdi dir="ltr" className="font-semibold">{email.trim().toLowerCase()}</bdi> فرستاده شد.
      </p>
      <label htmlFor="code" className="text-sm font-semibold">کد ورود</label>
      <div className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface px-3 focus-within:border-green">
        <KeyRound size={18} strokeWidth={1.75} className="text-ink-2" aria-hidden />
        <input
          ref={codeRef}
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          value={code}
          onChange={(e) => {
            // Keep only digits, so a pasted «کد: ۱۲۳ ۴۵۶» still works; send as soon as all six are in.
            const v = otpDigits(e.target.value);
            setCode(v);
            setError(null);
            if (v.length === OTP_LENGTH && !pending) verify(v);
          }}
          placeholder="123456"
          className="tabular h-12 min-w-0 flex-1 bg-transparent text-left text-lg tracking-[0.3em] outline-none placeholder:text-ink-2"
        />
      </div>
      {error && <p role="alert" className="text-sm leading-6 text-error">{error}</p>}
      {notice && !error && <p role="status" className="text-sm text-green-ink">{notice}</p>}
      <button type="submit" disabled={pending || code.length !== OTP_LENGTH} className="h-12 rounded-[var(--radius-btn)] bg-green-ink text-[15px] font-semibold text-surface transition-opacity duration-150 disabled:opacity-60">
        {pending ? "در حال بررسی…" : "ورود"}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" disabled={left > 0 || pending} onClick={() => send(true)} className="min-h-11 font-semibold text-green-ink disabled:font-normal disabled:text-ink-2">
          {left > 0 ? `ارسال دوباره تا ${countdownFa(left)}` : "کد را دوباره بفرست"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setError(null);
            setNotice(null);
          }}
          className="min-h-11 text-green-ink"
        >
          ایمیل را عوض کن
        </button>
      </div>
      <SpamHint />
    </form>
  );
}
