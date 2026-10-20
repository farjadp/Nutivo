import { faAgo, faDateTime } from "@/shared/lib/format";
import type { LogRow } from "../model/types";
import { EVENT_FA, EventCode, LevelPill } from "./bits";

export function LogTable({ rows, showActor = true }: { rows: LogRow[]; showActor?: boolean }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-ink-2">لاگی با این فیلتر نیست.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-line text-right text-xs text-ink-2">
            <th className="w-32 py-2 pe-3 font-medium">زمان</th>
            <th className="w-16 py-2 pe-3 font-medium">سطح</th>
            <th className="py-2 pe-3 font-medium">رویداد</th>
            {showActor && <th className="py-2 pe-3 font-medium">کاربر</th>}
            <th className="py-2 font-medium">جزئیات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line align-top">
          {rows.map((r) => {
            const meta = Object.entries(r.meta ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "");
            return (
              <tr key={r.id} className={r.level === "error" ? "bg-[color-mix(in_srgb,var(--error)_4%,transparent)]" : ""}>
                <td className="py-2.5 pe-3 text-xs text-ink-2" title={faDateTime(r.at)}>{faAgo(r.at)}</td>
                <td className="py-2.5 pe-3"><LevelPill level={r.level} /></td>
                <td className="py-2.5 pe-3">
                  <div className="grid gap-1">
                    <span>{EVENT_FA[r.event] ?? r.event}</span>
                    <span><EventCode>{r.event}</EventCode> <span className="text-[11px] text-ink-2">{r.kind === "system" ? "سیستم" : "فعالیت"}</span></span>
                  </div>
                </td>
                {showActor && (
                  <td className="py-2.5 pe-3">
                    {r.actor_id ? (
                      <a href={`/admin/users/${r.actor_id}`} dir="ltr" className="text-xs hover:text-green-ink">{r.actor_email ?? r.actor_id.slice(0, 8)}</a>
                    ) : (
                      <span dir="ltr" className="text-xs text-ink-2">{r.actor_email ?? "—"}</span>
                    )}
                  </td>
                )}
                <td className="py-2.5">
                  {r.message && <p className="mb-1 text-[13px]">{r.message}</p>}
                  {meta.length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs text-ink-2 hover:text-ink">{meta.length} فیلد</summary>
                      <dl dir="ltr" className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded bg-track p-2 font-mono text-[11px]">
                        {meta.map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt className="text-ink-2">{k}</dt>
                            <dd className="break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                  {!r.message && meta.length === 0 && <span className="text-ink-2">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
