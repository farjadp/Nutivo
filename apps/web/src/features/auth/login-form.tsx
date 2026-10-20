"use client";
import { Mail } from "lucide-react";
import { useActionState } from "react";
import { sendMagicLinkAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLinkAction, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div role="status" className="animate-rise rounded-[var(--radius-card)] bg-mint p-4 text-[15px] leading-7">
        لینک ورود به <span dir="ltr" className="font-semibold">{state.email}</span> فرستاده شد. ایمیلت را باز کن و روی لینک بزن.
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-3">
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
          defaultValue={state.email}
          placeholder="you@example.com"
          className="h-12 min-w-0 flex-1 bg-transparent text-left text-[15px] outline-none placeholder:text-ink-2"
        />
      </div>
      {state.status === "error" && <p role="alert" className="text-sm text-error">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-[var(--radius-btn)] bg-green-ink text-[15px] font-semibold text-surface transition-opacity duration-150 disabled:opacity-60"
      >
        {pending ? "در حال ارسال…" : "ارسال لینک ورود"}
      </button>
      <p className="text-xs leading-6 text-ink-2">رمز عبور لازم نیست. هر بار یک لینک یک‌بارمصرف به ایمیلت می‌آید.</p>
    </form>
  );
}
