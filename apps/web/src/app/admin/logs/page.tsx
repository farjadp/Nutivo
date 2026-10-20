import { Search } from "lucide-react";
import Link from "next/link";
import { listLogs, pageParam } from "@/features/admin/api/data.server";
import { requireAdmin } from "@/features/admin/api/guard.server";
import { PageHeader, Panel } from "@/features/admin/ui/bits";
import { LogTable } from "@/features/admin/ui/log-table";
import type { LogFilters } from "@/features/admin/model/types";
import { faInt } from "@/shared/lib/format";
import { Pagination } from "@/shared/ui/pagination";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const KINDS = [
  { v: "", l: "همه" },
  { v: "activity", l: "فعالیت کاربران" },
  { v: "system", l: "سیستم" },
] as const;
const LEVELS = [
  { v: "", l: "همه سطح‌ها" },
  { v: "info", l: "اطلاع" },
  { v: "warn", l: "هشدار" },
  { v: "error", l: "خطا" },
] as const;
const GROUPS = [
  { v: "", l: "همه رویدادها" },
  { v: "ai.", l: "هوش مصنوعی" },
  { v: "meal.", l: "وعده‌ها" },
  { v: "auth.", l: "ورود و ثبت‌نام" },
  { v: "profile.", l: "پروفایل" },
  { v: "admin.", l: "کارهای ادمین" },
  { v: "settings.", l: "تنظیمات" },
] as const;

export default async function LogsPage({ searchParams }: { searchParams: SP }) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const kind = one(sp.kind);
  const level = one(sp.level);
  const event = one(sp.event);
  const q = one(sp.q).trim().slice(0, 100);
  const page = pageParam(sp.page);
  const filters: LogFilters = {
    kind: kind === "activity" || kind === "system" ? kind : undefined,
    level: ["info", "warn", "error", "debug"].includes(level) ? (level as LogFilters["level"]) : undefined,
    event: GROUPS.some((g) => g.v === event) ? event || undefined : undefined,
    q: q || undefined,
  };
  const data = await listLogs(ctx, filters, page);
  const params = { kind: filters.kind, level: filters.level, event: filters.event, q: filters.q };

  const linkWith = (patch: Record<string, string | undefined>) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...patch })) if (v) s.set(k, v);
    return `/admin/logs${s.size ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="لاگ‌ها" sub={`${faInt(data.total)} رویداد · فعالیت کاربران و رویدادهای سیستم`} />
      <Panel>
        <div className="mb-3 grid gap-3">
          <div className="flex flex-wrap gap-1" role="group" aria-label="نوع">
            {KINDS.map((k) => (
              <Link key={k.v || "all"} href={linkWith({ kind: k.v || undefined })} aria-current={(filters.kind ?? "") === k.v ? "true" : undefined} className={`rounded-full px-3 py-1.5 text-sm ${(filters.kind ?? "") === k.v ? "bg-mint font-semibold text-green-ink" : "text-ink-2 hover:bg-track"}`}>
                {k.l}
              </Link>
            ))}
          </div>
          <form className="flex flex-wrap items-center gap-2" role="search">
            {filters.kind && <input type="hidden" name="kind" value={filters.kind} />}
            <label htmlFor="level" className="sr-only">سطح</label>
            <select id="level" name="level" defaultValue={filters.level ?? ""} className="h-10 rounded-[var(--radius-btn)] border border-line bg-surface px-2 text-sm">
              {LEVELS.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
            </select>
            <label htmlFor="event" className="sr-only">گروه رویداد</label>
            <select id="event" name="event" defaultValue={filters.event ?? ""} className="h-10 rounded-[var(--radius-btn)] border border-line bg-surface px-2 text-sm">
              {GROUPS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
            </select>
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface px-3 focus-within:border-green">
              <Search size={16} strokeWidth={1.75} className="text-ink-2" aria-hidden />
              <label htmlFor="q" className="sr-only">جست‌وجو</label>
              <input id="q" name="q" defaultValue={q} placeholder="ایمیل، رویداد یا متن پیام" dir="auto" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-2" />
            </div>
            <button type="submit" className="h-10 rounded-[var(--radius-btn)] bg-green-ink px-4 text-sm font-semibold text-surface">اعمال</button>
            {(filters.level || filters.event || filters.q || filters.kind) && (
              <Link href="/admin/logs" className="h-10 content-center rounded-[var(--radius-btn)] px-3 text-sm text-ink-2 hover:bg-track">پاک کردن فیلترها</Link>
            )}
          </form>
        </div>
        <LogTable rows={data.rows} />
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} params={params} basePath="/admin/logs" label="رویداد" />
      </Panel>
    </>
  );
}
