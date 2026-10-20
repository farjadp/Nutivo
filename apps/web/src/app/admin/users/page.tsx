import { Search } from "lucide-react";
import Link from "next/link";
import { listUsers, pageParam } from "@/features/admin/api/data.server";
import { requireAdmin } from "@/features/admin/api/guard.server";
import { AdminBadge, PageHeader, Panel, StatusPill } from "@/features/admin/ui/bits";
import { faAgo, faDateTime, faInt } from "@/shared/lib/format";
import { Pagination } from "@/shared/ui/pagination";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const STATUS = [
  { v: "", l: "همه" },
  { v: "active", l: "فعال" },
  { v: "blocked", l: "مسدود" },
];

export default async function UsersPage({ searchParams }: { searchParams: SP }) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const status = ["active", "blocked"].includes(one(sp.status)) ? one(sp.status) : "";
  const page = pageParam(sp.page);
  const data = await listUsers(ctx, { q, status, page });
  const params = { q: q || undefined, status: status || undefined };

  return (
    <>
      <PageHeader title="کاربران" sub={`${faInt(data.total)} کاربر`} />
      <Panel>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <form className="flex min-w-[240px] flex-1 items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface px-3 focus-within:border-green" role="search">
            <Search size={16} strokeWidth={1.75} className="text-ink-2" aria-hidden />
            <label htmlFor="q" className="sr-only">جست‌وجوی ایمیل</label>
            <input id="q" name="q" defaultValue={q} placeholder="جست‌وجوی ایمیل" dir="auto" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-2" />
            {status && <input type="hidden" name="status" value={status} />}
          </form>
          <div className="flex gap-1" role="group" aria-label="وضعیت">
            {STATUS.map((s) => {
              const sp2 = new URLSearchParams();
              if (q) sp2.set("q", q);
              if (s.v) sp2.set("status", s.v);
              const on = status === s.v;
              return (
                <Link key={s.v || "all"} href={`/admin/users${sp2.size ? `?${sp2}` : ""}`} aria-current={on ? "true" : undefined} className={`rounded-full px-3 py-1.5 text-sm ${on ? "bg-mint font-semibold text-green-ink" : "text-ink-2 hover:bg-track"}`}>
                  {s.l}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-right text-xs text-ink-2">
                <th className="py-2 pe-3 font-medium">ایمیل</th>
                <th className="py-2 pe-3 font-medium">وضعیت</th>
                <th className="py-2 pe-3 font-medium">ثبت‌نام</th>
                <th className="py-2 pe-3 font-medium">آخرین ورود</th>
                <th className="py-2 pe-3 font-medium">وعده ۷ روز</th>
                <th className="py-2 pe-3 font-medium">کل وعده‌ها</th>
                <th className="py-2 font-medium">آخرین وعده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.rows.map((u) => (
                <tr key={u.id} className="hover:bg-ground">
                  <td className="py-2.5 pe-3">
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2 font-medium hover:text-green-ink">
                      <span dir="ltr" className="truncate">{u.email}</span>
                      {u.is_admin && <AdminBadge />}
                    </Link>
                  </td>
                  <td className="py-2.5 pe-3"><StatusPill status={u.status} /></td>
                  <td className="py-2.5 pe-3 text-ink-2" title={faDateTime(u.created_at)}>{faAgo(u.created_at)}</td>
                  <td className="py-2.5 pe-3 text-ink-2" title={faDateTime(u.last_sign_in_at)}>{faAgo(u.last_sign_in_at)}</td>
                  <td className="tabular py-2.5 pe-3">{faInt(u.meals_7d)}</td>
                  <td className="tabular py-2.5 pe-3">{faInt(u.meals_total)}</td>
                  <td className="py-2.5 text-ink-2">{faAgo(u.last_meal_at)}</td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-ink-2">کاربری با این فیلتر پیدا نشد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} params={params} basePath="/admin/users" label="کاربر" />
      </Panel>
    </>
  );
}
