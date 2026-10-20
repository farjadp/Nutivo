"use client";
import { useState, useTransition, type ReactNode } from "react";
import type { AdminResult } from "../api/actions";

const TONE = {
  primary: "bg-green-ink text-surface hover:opacity-90",
  neutral: "border border-line bg-surface hover:border-green",
  danger: "border border-error/40 bg-surface text-error hover:bg-[color-mix(in_srgb,var(--error)_8%,transparent)]",
} as const;

/** Runs a server action and shows its result inline. */
export function ActionButton({ run, children, tone = "neutral", disabled }: { run: () => Promise<AdminResult>; children: ReactNode; tone?: keyof typeof TONE; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<AdminResult | null>(null);
  return (
    <div className="grid gap-1">
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() => start(async () => setRes(await run()))}
        className={`h-9 rounded-[var(--radius-btn)] px-3 text-sm font-medium transition-colors duration-150 disabled:opacity-50 ${TONE[tone]}`}
      >
        {pending ? "…" : children}
      </button>
      {res && <p role="status" className={`text-xs ${res.ok ? "text-success" : "text-error"}`}>{res.ok ? res.message : res.error}</p>}
    </div>
  );
}
