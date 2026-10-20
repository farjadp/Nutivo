"use client";
import { faInt } from "@/shared/lib/format";
import { useTween } from "../model/use-tween";

const SIZE = 216;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

interface Props {
  consumed: number;
  goal: number;
  estimated: number;
  /** Changes whenever a meal is confirmed, to replay the glow. */
  pulseKey: number;
}

export function CalorieRing({ consumed, goal, estimated, pulseKey }: Props) {
  const pct = goal > 0 ? consumed / goal : 0;
  const fill = useTween(Math.min(pct, 1), { duration: 1100, delay: 120 });
  const over = useTween(Math.max(0, Math.min(pct - 1, 0.35)), { duration: 900, delay: 600 });
  const shown = useTween(consumed, { duration: 1100, delay: 120 });
  const remaining = goal - shown;
  const isOver = consumed > goal;

  return (
    <div className="relative mx-auto grid size-[216px] place-items-center" role="img" aria-label={`${faInt(consumed)} از ${faInt(goal)} کیلوکالری`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" className="stroke-track" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          className="stroke-green"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fill)}
        />
        {over > 0.001 && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            className="stroke-fat"
            strokeWidth={STROKE - 6}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - over)}
          />
        )}
      </svg>

      <div key={pulseKey} className={`grid size-[164px] place-items-center rounded-full ${pulseKey ? "animate-glow" : ""}`}>
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="tabular text-[40px] leading-none font-bold tracking-tight">{faInt(Math.abs(remaining))}</span>
          <span className={`text-[13px] font-medium ${isOver ? "text-fat-ink" : "text-ink-2"}`}>
            {isOver ? "کیلوکالری بیشتر از هدف" : "کیلوکالری باقی‌مانده"}
          </span>
          <span className="tabular mt-1.5 text-xs text-ink-2">
            {faInt(shown)} از {faInt(goal)}
          </span>
        </div>
      </div>

      {estimated > 0 && (
        <span className="tabular absolute -bottom-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] text-ink-2">
          ≈ {faInt(estimated)} کالری تخمینی
        </span>
      )}
    </div>
  );
}
