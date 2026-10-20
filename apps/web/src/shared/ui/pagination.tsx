import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { faInt } from "@/shared/lib/format";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  /** Current query params; `param` is replaced with the target page. */
  params: Record<string, string | undefined>;
  basePath: string;
  param?: string;
  label?: string;
}

function href(basePath: string, params: Record<string, string | undefined>, param: string, page: number) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== param) sp.set(k, v);
  if (page > 1) sp.set(param, String(page));
  const q = sp.toString();
  return q ? `${basePath}?${q}` : basePath;
}

/** Windowed page list: 1 … 4 5 [6] 7 8 … 20 */
function windowed(page: number, pages: number): (number | "…")[] {
  const set = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageSize, total, params, basePath, param = "page", label = "مورد" }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "grid h-9 min-w-9 place-items-center rounded-[var(--radius-btn)] px-2 text-sm tabular transition-colors duration-150";

  return (
    <nav aria-label="صفحه‌بندی" className="flex flex-wrap items-center justify-between gap-3 pt-3">
      <p className="tabular text-xs text-ink-2">
        {faInt(from)}–{faInt(to)} از {faInt(total)} {label}
      </p>
      {pages > 1 && (
        <ul className="flex items-center gap-1">
          <li>
            {page > 1 ? (
              <Link href={href(basePath, params, param, page - 1)} className={`${btn} border border-line bg-surface hover:border-green`} aria-label="صفحه قبل" rel="prev">
                <ChevronRight size={16} strokeWidth={2} />
              </Link>
            ) : (
              <span className={`${btn} border border-line text-ink-2/50`} aria-hidden><ChevronRight size={16} strokeWidth={2} /></span>
            )}
          </li>
          {windowed(page, pages).map((p, i) =>
            p === "…" ? (
              <li key={`gap-${i}`} className="px-1 text-ink-2" aria-hidden>…</li>
            ) : (
              <li key={p}>
                <Link
                  href={href(basePath, params, param, p)}
                  aria-current={p === page ? "page" : undefined}
                  className={`${btn} ${p === page ? "bg-green-ink font-semibold text-surface" : "border border-line bg-surface hover:border-green"}`}
                >
                  {faInt(p)}
                </Link>
              </li>
            ),
          )}
          <li>
            {page < pages ? (
              <Link href={href(basePath, params, param, page + 1)} className={`${btn} border border-line bg-surface hover:border-green`} aria-label="صفحه بعد" rel="next">
                <ChevronLeft size={16} strokeWidth={2} />
              </Link>
            ) : (
              <span className={`${btn} border border-line text-ink-2/50`} aria-hidden><ChevronLeft size={16} strokeWidth={2} /></span>
            )}
          </li>
        </ul>
      )}
    </nav>
  );
}
