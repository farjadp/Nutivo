import { Sparkles } from "lucide-react";

export function InsightCard({ text, hint }: { text: string; hint?: string }) {
  return (
    <section aria-labelledby="insight-title" className="rounded-[var(--radius-card)] bg-purple-tint p-4">
      <h2 id="insight-title" className="flex items-center gap-2 text-sm font-semibold text-purple-ink">
        <Sparkles size={16} strokeWidth={2} aria-hidden />
        <span className="font-[family-name:var(--font-en)] tracking-tight" dir="ltr">Nutivo Insight</span>
      </h2>
      <p className="mt-2 text-[15px] leading-7">{text}</p>
      {hint && <p className="mt-1 text-[13px] leading-6 text-ink-2">{hint}</p>}
    </section>
  );
}
