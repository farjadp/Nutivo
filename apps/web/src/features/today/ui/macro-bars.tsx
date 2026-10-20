"use client";
import { faInt } from "@/shared/lib/format";
import { useTween } from "../model/use-tween";

/** The bar spans 125% of the goal so the target tick stays visible when the user goes past it. */
const SCALE = 1.25;

interface Row {
  key: "protein" | "carbs" | "fat";
  label: string;
  consumed: number;
  goal: number;
  estimated: number;
  fillClass: string;
  ink: string;
}

function Bar({ row, index }: { row: Row; index: number }) {
  const pct = row.goal > 0 ? row.consumed / row.goal : 0;
  const w = useTween(Math.min(pct, SCALE) / SCALE, { duration: 900, delay: 260 + index * 90 });
  const estW = row.goal > 0 ? Math.min(row.estimated / row.goal, SCALE) / SCALE : 0;
  const left = row.goal - row.consumed;
  const target = 1 / SCALE;

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{row.label}</span>
        <span className="tabular text-[13px] text-ink-2">
          <span className={`font-semibold ${row.ink}`}>{faInt(row.consumed)}</span> / {faInt(row.goal)} گرم
        </span>
      </div>
      <div className="relative">
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="block h-2.5 w-full -scale-x-100 overflow-hidden rounded-full" aria-hidden>
        <rect x="0" y="0" width="100" height="10" className="fill-track" />
        <rect x="0" y="0" width={Math.max(0, w * 100)} height="10" className={row.fillClass} />
        {estW > 0 && (
          <rect
            x={Math.max(0, w * 100 - estW * 100)}
            y="0"
            width={Math.min(estW * 100, w * 100)}
            height="10"
            fill="url(#est-hatch)"
          />
        )}
      </svg>
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="pointer-events-none absolute -inset-y-1 inset-x-0 h-[calc(100%+8px)] w-full -scale-x-100" aria-hidden>
        <line x1={target * 100} x2={target * 100} y1="0" y2="10" className="stroke-ink" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      </div>
      <span className="tabular text-xs text-ink-2">
        {left >= 0 ? `${faInt(left)} گرم مانده` : `${faInt(-left)} گرم بیشتر از هدف`}
      </span>
    </li>
  );
}

export function MacroBars({ rows }: { rows: Row[] }) {
  return (
    <>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <pattern id="est-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="1.4" height="3" className="fill-surface" opacity="0.55" />
          </pattern>
        </defs>
      </svg>
      <ul className="grid gap-4">
        {rows.map((r, i) => (
          <Bar key={r.key} row={r} index={i} />
        ))}
      </ul>
    </>
  );
}
