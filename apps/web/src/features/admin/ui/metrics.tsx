import type { AdminMetrics, RetentionCell } from "../model/types";
import { addDays, faInt } from "@/shared/lib/format";

const pct = (c: RetentionCell) => (c.eligible > 0 ? c.retained / c.eligible : null);
const faPctOrDash = (r: number | null) => (r == null ? "—" : `${faInt(r * 100)}٪`);

/** Discrete tints keep the heatmap in Tailwind classes (no inline styles). Text stays readable on every step. */
function heat(r: number | null): string {
  if (r == null) return "bg-track text-ink-2";
  if (r >= 0.6) return "bg-green-ink text-surface";
  if (r >= 0.4) return "bg-green text-surface";
  if (r >= 0.25) return "bg-green/40 text-ink";
  if (r >= 0.1) return "bg-green/20 text-ink";
  return "bg-mint text-ink";
}

export function RetentionKpis({ m }: { m: AdminMetrics }) {
  const rows = [
    { k: "D1", c: m.retention.d1, target: null as number | null },
    { k: "D7", c: m.retention.d7, target: 0.35 },
    { k: "D30", c: m.retention.d30, target: null },
  ];
  return (
    <ul className="grid grid-cols-3 gap-3">
      {rows.map(({ k, c, target }) => {
        const r = pct(c);
        return (
          <li key={k} className="rounded-[var(--radius-card)] border border-line bg-surface p-3.5 shadow-[var(--shadow-soft)]">
            <p className="font-[family-name:var(--font-en)] text-xs font-semibold text-ink-2" dir="ltr">{k}</p>
            <p className="tabular text-2xl font-bold">{faPctOrDash(r)}</p>
            <p className="tabular text-[11px] text-ink-2">
              {c.eligible ? `${faInt(c.retained)} از ${faInt(c.eligible)} نفر` : "هنوز کسی به این روز نرسیده"}
              {target != null && r != null && <span className={r >= target ? " text-success" : " text-fat-ink"}> · هدف {faInt(target * 100)}٪</span>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function CohortTable({ m }: { m: AdminMetrics }) {
  if (!m.cohorts.length) return <p className="text-sm text-ink-2">هنوز کسی ثبت نکرده.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-center text-[13px]">
        <thead>
          <tr className="text-[11px] text-ink-2">
            <th scope="col" className="text-start font-medium">هفته شروع</th>
            <th scope="col" className="font-medium">نفر</th>
            <th scope="col" className="font-medium" dir="ltr">D1</th>
            <th scope="col" className="font-medium" dir="ltr">D7</th>
            <th scope="col" className="font-medium" dir="ltr">D30</th>
          </tr>
        </thead>
        <tbody>
          {m.cohorts.map((c) => (
            <tr key={c.week}>
              <th scope="row" className="tabular text-start font-medium whitespace-nowrap">
                {new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { day: "numeric", month: "short" }).format(new Date(`${c.week}T12:00:00`))}
              </th>
              <td className="tabular">{faInt(c.size)}</td>
              {[c.d1, c.d7, c.d30].map((cell, i) => (
                <td key={i} className={`tabular rounded-[8px] px-2 py-2 font-semibold ${heat(pct(cell))}`} title={`${cell.retained} / ${cell.eligible}`}>
                  {faPctOrDash(pct(cell))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FrequencyChart({ m }: { m: AdminMetrics }) {
  const max = Math.max(1, ...m.frequency.histogram.map((h) => h.users));
  const W = 7 * 40;
  return (
    <div>
      <svg viewBox={`0 0 ${W} 120`} className="h-36 w-full -scale-x-100" role="img" aria-label="تعداد کاربران بر اساس روزهای ثبت در ۷ روز اخیر">
        {m.frequency.histogram.map((h, i) => {
          const hgt = (h.users / max) * 92;
          return (
            <g key={h.days}>
              <rect x={i * 40 + 6} y={100 - hgt} width="28" height={Math.max(hgt, 1)} rx="4" className={h.days >= 4 ? "fill-green" : "fill-green/35"} />
            </g>
          );
        })}
        <line x1={3 * 40 + 2} x2={3 * 40 + 2} y1="0" y2="100" className="stroke-ink-2" strokeDasharray="3 3" strokeWidth="1" />
      </svg>
      <ul className="tabular -mt-3 grid grid-cols-7 text-center text-[11px] text-ink-2">
        {m.frequency.histogram.map((h) => (
          <li key={h.days}>
            <span className="block font-semibold text-ink">{faInt(h.users)}</span>
            {faInt(h.days)} روز
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface CostDay {
  date: string;
  usd: number;
  calls: number;
}

export function aiCost(m: AdminMetrics, price: { input: number; output: number }) {
  const cost = (tin: number, tout: number) => (tin * price.input + tout * price.output) / 1_000_000;
  const days: CostDay[] = Array.from({ length: 14 }, (_, i) => ({ date: addDays(m.today, i - 13), usd: 0, calls: 0 }));
  const byEvent = new Map<string, { calls: number; tin: number; tout: number; usd: number }>();
  for (const r of m.ai) {
    const usd = cost(r.input_tokens, r.output_tokens);
    const d = days.find((x) => x.date === r.date);
    if (d) {
      d.usd += usd;
      d.calls += r.calls;
    }
    const e = byEvent.get(r.event) ?? { calls: 0, tin: 0, tout: 0, usd: 0 };
    byEvent.set(r.event, { calls: e.calls + r.calls, tin: e.tin + r.input_tokens, tout: e.tout + r.output_tokens, usd: e.usd + usd });
  }
  return { days, byEvent, total: days.reduce((a, d) => a + d.usd, 0) };
}

const usdFmt = new Intl.NumberFormat("fa-IR", { style: "currency", currency: "USD", maximumFractionDigits: 2, minimumFractionDigits: 2 });
export const faUsd = (n: number) => usdFmt.format(n);

export function CostChart({ days }: { days: CostDay[] }) {
  const max = Math.max(0.01, ...days.map((d) => d.usd));
  const W = days.length * 24;
  return (
    <div>
      <svg viewBox={`0 0 ${W} 110`} className="h-36 w-full -scale-x-100" role="img" aria-label="هزینه روزانه هوش مصنوعی در ۱۴ روز اخیر">
        <line x1="0" x2={W} y1="100" y2="100" className="stroke-line" strokeWidth="1" />
        {days.map((d, i) => {
          const h = (d.usd / max) * 92;
          return (
            <rect key={d.date} x={i * 24 + 4} y={100 - h} width="16" height={Math.max(h, d.calls ? 1.5 : 0)} rx="3" className="fill-purple">
              <title>{`${d.date}: ${faUsd(d.usd)} · ${d.calls} calls`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="tabular -mt-2 flex justify-between text-[11px] text-ink-2">
        <span>{new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { day: "numeric", month: "short" }).format(new Date(`${days[0]!.date}T12:00:00`))}</span>
        <span>امروز</span>
      </div>
    </div>
  );
}
