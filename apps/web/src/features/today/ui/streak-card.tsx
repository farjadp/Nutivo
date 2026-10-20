"use client";
import { Check, Flame, Moon } from "lucide-react";
import { addDays, faInt, faWeekdayInitial } from "@/shared/lib/format";

interface Props {
  today: string;
  logDates: string[];
  current: number;
  loggedToday: boolean;
  complete: { kcalOk: boolean; proteinOk: boolean; loggedThree: boolean; done: boolean; met: number };
}

export function StreakCard({ today, logDates, current, loggedToday, complete }: Props) {
  const logged = new Set(logDates);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const conditions = [
    { ok: complete.loggedThree, label: "۳ وعده ثبت شد" },
    { ok: complete.kcalOk, label: "کالری در محدوده" },
    { ok: complete.proteinOk, label: "پروتئین کافی" },
  ];

  return (
    <section aria-labelledby="streak-title" className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <h2 id="streak-title" className="flex items-center gap-2 text-base font-semibold">
          <span className="grid size-8 place-items-center rounded-full bg-mint text-green-ink">
            <Flame size={18} strokeWidth={2} aria-hidden />
          </span>
          <span>
            <span className="tabular">{faInt(current)}</span> روز پشت‌سرهم
          </span>
        </h2>
        {complete.done ? (
          <span key="done" className="animate-pop rounded-full bg-green-ink px-3 py-1 text-xs font-semibold text-surface">روز کامل</span>
        ) : (
          <span className="tabular text-xs text-ink-2">روز کامل: {faInt(complete.met)} از ۳</span>
        )}
      </div>

      <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="هفت روز اخیر">
        {days.map((d) => {
          const isToday = d === today;
          const done = isToday ? loggedToday : logged.has(d);
          const forgiven = !done && !isToday;
          return (
            <li key={d} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-ink-2">{faWeekdayInitial(d)}</span>
              {done ? (
                <span
                  key={`${d}-${done}`}
                  className={`grid size-8 place-items-center rounded-full bg-green text-surface ${isToday ? "animate-pop ring-2 ring-green ring-offset-2 ring-offset-surface" : ""}`}
                >
                  <Check size={16} strokeWidth={2.5} aria-label="ثبت شد" />
                </span>
              ) : forgiven ? (
                <span className="grid size-8 place-items-center rounded-full border border-dashed border-ink-2/60 text-ink-2" title="روز مرخصی هفته">
                  <Moon size={14} strokeWidth={2} aria-label="روز مرخصی" />
                </span>
              ) : (
                <span className="size-8 rounded-full border-2 border-green/60" aria-label="امروز، هنوز ثبت نشده" />
              )}
            </li>
          );
        })}
      </ol>

      <ul className="mt-4 flex flex-wrap gap-2">
        {conditions.map((c) => (
          <li
            key={c.label}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${c.ok ? "bg-mint text-green-ink" : "bg-track text-ink-2"}`}
          >
            {c.ok && <Check size={12} strokeWidth={2.5} aria-hidden />}
            {c.label}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-2">یک روز در هفته مرخصی داری؛ زنجیره با آن نمی‌شکند.</p>
    </section>
  );
}
