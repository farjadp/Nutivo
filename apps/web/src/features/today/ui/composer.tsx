"use client";
import { Camera, History, SendHorizontal, Sparkles } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import type { QuickMeal } from "@/entities/day/sample";
import { FoodIcon } from "@/shared/ui/food-icon";
import { nutiSay } from "@/features/mascot/model/lines";
import { Nuti } from "@/features/mascot/ui/nuti";

interface Props {
  quickMeals: QuickMeal[];
  usedQuick: Set<string>;
  busy: boolean;
  /** Show نوتی chewing while Claude reads the meal. */
  nuti?: boolean;
  onQuick: (q: QuickMeal) => void;
  onText: (text: string) => void;
  onPhoto: (file: File, caption: string) => void;
  /** Review mode: open the confirm sheet with a sample meal (no Claude call). */
  onSampleDraft?: () => void;
}

export function Composer({ quickMeals, usedQuick, busy, nuti = false, onQuick, onText, onPhoto, onSampleDraft }: Props) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    onText(text.trim());
    setText("");
  }

  if (busy && nuti) {
    return (
      <div role="status" className="flex h-[58px] items-center gap-3 rounded-[var(--radius-card)] bg-purple-tint px-3 text-[14px] font-medium text-purple-ink">
        <Nuti mood="chew" size={44} label="" />
        {nutiSay("chewing", {}, Math.floor(Date.now() / 1000)).text}
      </div>
    );
  }

  if (busy) {
    return (
      <div role="status" className="flex h-[58px] items-center gap-3 rounded-[var(--radius-card)] bg-purple-tint px-4 text-[15px] text-purple-ink">
        <Sparkles size={18} strokeWidth={2} className="animate-pulse" aria-hidden />
        Nutivo دارد وعده را می‌خواند…
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {(quickMeals.length > 0 || onSampleDraft) && (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5" role="group" aria-label="تکراری‌ها">
          <History size={16} strokeWidth={2} className="shrink-0 text-ink-2" aria-hidden />
          {quickMeals.map((q) => (
            <button
              key={q.id}
              type="button"
              disabled={usedQuick.has(q.id)}
              onClick={() => onQuick(q)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border py-1.5 ps-2 pe-3 text-[13px] font-medium transition-colors duration-150 hover:border-green hover:bg-mint disabled:cursor-default disabled:opacity-45 ${q.yesterday ? "border-green/50 bg-mint text-green-ink" : "border-line bg-surface"}`}
            >
              <FoodIcon food={q.iconFood ?? { name_fa: q.label }} size={18} className="text-green-ink" label="" />
              {q.label}
            </button>
          ))}
          {onSampleDraft && (
            <button
              type="button"
              onClick={onSampleDraft}
              className="shrink-0 rounded-full border border-dashed border-purple/50 bg-purple-tint px-3 py-1.5 text-[13px] font-medium text-purple-ink"
            >
              نمونه تأیید
            </button>
          )}
        </div>
      )}
      <form onSubmit={submit} className="flex items-center gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-1.5 shadow-[var(--shadow-soft)] focus-within:border-green">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          id="log-photo"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onPhoto(f, text.trim());
            setText("");
          }}
        />
        <label
          htmlFor="log-photo"
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[var(--radius-btn)] bg-mint text-green-ink transition-colors duration-150 hover:bg-green hover:text-surface"
          aria-label="عکس بگیر"
        >
          <Camera size={20} strokeWidth={2} />
        </label>
        <label htmlFor="log-text" className="sr-only">چی خوردی؟</label>
        <input
          id="log-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="چی خوردی؟"
          maxLength={600}
          className="min-w-0 flex-1 bg-transparent px-1 text-[15px] outline-none placeholder:text-ink-2"
          autoComplete="off"
          enterKeyHint="send"
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
