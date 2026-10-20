"use client";
import { Confetti, Nuti, type NutiMood } from "./nuti";

/** نوتی speaking: her line in a speech bubble, the factual hint underneath. Purple = Nutivo's insight voice. */
export function NutiCard({ mood, text, hint, hopKey, celebrate }: { mood: NutiMood; text: string; hint?: string; hopKey: number; celebrate: boolean }) {
  return (
    <section aria-label="نوتی" className="relative flex items-end gap-3 rounded-[var(--radius-card)] bg-purple-tint p-4 pb-3">
      {celebrate && <Confetti key={hopKey} />}
      <Nuti mood={mood} size={76} hopKey={hopKey} className="-mb-1" />
      <div className="relative min-w-0 flex-1 rounded-[16px] rounded-es-[4px] bg-surface px-3.5 py-2.5 shadow-[var(--shadow-soft)]">
        <p className="text-[11px] font-semibold text-purple-ink">نوتی</p>
        <p key={text} className="animate-rise text-[15px] font-medium leading-7">{text}</p>
        {hint && <p className="mt-0.5 text-[13px] leading-6 text-ink-2">{hint}</p>}
      </div>
    </section>
  );
}
