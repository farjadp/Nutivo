"use client";
import { passwordProblem } from "@nutivo/core";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { setPasswordAction } from "./actions";

/** Set or change the optional password. The account was proven by a code, so no old password is asked for. */
export function PasswordForm() {
  const [pw, setPw] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const problem = pw ? passwordProblem(pw, repeat || undefined) : null;
  const ready = !passwordProblem(pw, repeat);

  if (done) {
    return (
      <div role="status" className="animate-rise grid gap-3 rounded-[var(--radius-card)] bg-mint p-4">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-green-ink"><Check size={18} strokeWidth={2.5} aria-hidden />رمز ذخیره شد</p>
        <p className="text-sm leading-7">از این به بعد با ایمیل و رمز هم وارد می‌شوی. ورود با کد هم مثل قبل کار می‌کند.</p>
        <Link href="/me" className="text-sm font-semibold text-green-ink hover:underline">برگشت به «من»</Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setPasswordAction(pw, repeat);
          if (r.ok) setDone(true);
          else setError(r.error);
        });
      }}
      className="grid gap-3"
    >
      {(
        [
          ["new-password", "رمز تازه", pw, setPw, "دست‌کم ۸ کاراکتر، حرف و عدد"],
          ["repeat-password", "تکرار رمز", repeat, setRepeat, ""],
        ] as const
      ).map(([id, label, value, set, ph]) => (
        <div key={id} className="grid gap-1.5">
          <label htmlFor={id} className="text-sm font-semibold">{label}</label>
          <input
            id={id}
            type="password"
            autoComplete="new-password"
            dir="ltr"
            value={value}
            placeholder={ph}
            onChange={(e) => {
              set(e.target.value);
              setError(null);
            }}
            className="h-12 rounded-[var(--radius-btn)] border border-line bg-surface px-3 text-left text-[15px] outline-none focus:border-green placeholder:text-right placeholder:text-ink-2"
          />
        </div>
      ))}
      {(error || problem) && <p role="alert" className={`text-sm ${error ? "text-error" : "text-fat-ink"}`}>{error ?? problem}</p>}
      <button type="submit" disabled={!ready || pending} className="h-12 rounded-[var(--radius-btn)] bg-green-ink text-[15px] font-semibold text-surface disabled:opacity-60">
        {pending ? "در حال ذخیره…" : "ذخیره رمز"}
      </button>
    </form>
  );
}
