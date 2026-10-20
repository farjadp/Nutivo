"use client";
import { useEffect, useRef } from "react";
import { addDays, faDayLabel, faInt, faWeekdayInitial } from "@/shared/lib/format";
import { DAY_WINDOW } from "../model/day";

export type DayMark = "complete" | "logged" | "none";

interface Props {
  today: string;
  selected: string;
  marks: Record<string, DayMark>;
  onSelect: (date: string) => void;
}

const dayNum = (d: string) => faInt(Number(d.slice(8, 10)));

/**
 * Horizontal strip of the last three weeks. RTL: older days sit to the right, today at the far left,
 * so scrolling follows the same direction as the calendar the user reads.
 */
export function DayStrip({ today, selected, marks, onSelect }: Props) {
  const days = Array.from({ length: DAY_WINDOW }, (_, i) => addDays(today, i - (DAY_WINDOW - 1)));
  const listRef = useRef<HTMLOListElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-day="${selected}"]`);
    // Land on the selected day instantly on load; animate only when the user changes day.
    void el?.scrollIntoView({ inline: "center", block: "nearest", behavior: first.current ? "instant" : "smooth" });
    first.current = false;
  }, [selected]);

  return (
    <nav aria-label="روزها" className="-mx-4 mt-3">
      <ol ref={listRef} className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((d) => {
          const on = d === selected;
          const mark = marks[d] ?? "none";
          const isToday = d === today;
          return (
            <li key={d} data-day={d} className="snap-center">
              <button
                type="button"
                onClick={() => onSelect(d)}
                aria-current={on ? "date" : undefined}
                aria-label={`${isToday ? "امروز" : faDayLabel(d)}${mark === "complete" ? "، روز کامل" : mark === "logged" ? "، ثبت شده" : ""}`}
                className={`flex h-[68px] w-11 flex-col items-center justify-center gap-1 rounded-[14px] border transition-colors duration-200 ${
                  on ? "border-green-ink bg-green-ink text-surface" : isToday ? "border-green/60 bg-surface" : "border-transparent hover:bg-track"
                }`}
              >
                <span className={`text-[11px] ${on ? "text-surface/80" : "text-ink-2"}`}>{faWeekdayInitial(d)}</span>
                <span className="tabular text-[15px] font-semibold">{dayNum(d)}</span>
                <span
                  aria-hidden
                  className={`size-1.5 rounded-full ${
                    mark === "complete" ? (on ? "bg-surface" : "bg-green") : mark === "logged" ? (on ? "bg-surface/60" : "bg-green/45") : "bg-transparent"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
