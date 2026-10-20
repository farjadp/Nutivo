"use client";
import { Camera, History, SendHorizontal } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { QuickMeal } from "@/entities/day/sample";

interface Props {
  quickMeals: QuickMeal[];
  usedQuick: Set<string>;
  onQuick: (q: QuickMeal) => void;
  onNotice: (msg: string) => void;
}

export function Composer({ quickMeals, usedQuick, onQuick, onNotice }: Props) {
  const [text, setText] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onNotice("ثبت با متن بعد از وصل شدن Claude فعال می‌شود. فعلاً از تکراری‌ها استفاده کن.");
    setText("");
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5" role="group" aria-label="تکراری‌ها">
        <History size={16} strokeWidth={2} className="shrink-0 text-ink-2" aria-hidden />
        {quickMeals.map((q) => {
          const used = usedQuick.has(q.id);
          return (
            <button
              key={q.id}
              type="button"
              disabled={used}
              onClick={() => onQuick(q)}
              className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 hover:border-green hover:bg-mint disabled:cursor-default disabled:opacity-45"
            >
              {q.label}
            </button>
          );
        })}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-1.5 shadow-[var(--shadow-soft)] focus-within:border-green">
        <button
          type="button"
          onClick={() => onNotice("ثبت با عکس بعد از وصل شدن Claude vision فعال می‌شود.")}
          className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-btn)] bg-mint text-green-ink transition-colors duration-150 hover:bg-green hover:text-surface"
          aria-label="عکس بگیر"
        >
          <Camera size={20} strokeWidth={2} />
        </button>
        <label htmlFor="log-text" className="sr-only">چی خوردی؟</label>
        <input
          id="log-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="چی خوردی؟"
          className="min-w-0 flex-1 bg-transparent px-1 text-[15px] outline-none placeholder:text-ink-2"
          autoComplete="off"
        />
        <button
          type="submit"
          className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-btn)] bg-green-ink text-surface transition-opacity duration-150 disabled:opacity-40"
          disabled={!text.trim()}
          aria-label="ثبت"
        >
          <SendHorizontal size={20} strokeWidth={2} className="-scale-x-100" />
        </button>
      </form>
    </div>
  );
}
