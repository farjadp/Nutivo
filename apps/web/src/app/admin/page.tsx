import { AlertTriangle, Ban, Cpu, UserCheck, Users, Utensils } from "lucide-react";
import Link from "next/link";
import { getStats, listLogs, listUsers } from "@/features/admin/api/data.server";
import { requireAdmin } from "@/features/admin/api/guard.server";
import { EVENT_FA, EventCode, LevelPill, PageHeader, Panel } from "@/features/admin/ui/bits";
import { faAgo, faInt } from "@/shared/lib/format";

export default async function AdminDashboard() {
  const ctx = await requireAdmin();
  const [{ stats }, errors, users] = await Promise.all([
    getStats(ctx),
    listLogs(ctx, { level: "error" }, 1, 5),
    listUsers(ctx, { page: 1 }),
  ]);

  const kpis = [
    { label: "کاربران", value: stats.users_total, sub: `${faInt(stats.users_7d)} نفر در ۷ روز اخیر`, Icon: Users, tone: "text-green-ink bg-mint" },
    { label: "فعال امروز", value: stats.active_today, sub: `${faInt(stats.active_7d)} فعال در ۷ روز`, Icon: UserCheck, tone: "text-green-ink bg-mint" },
    { label: "وعده‌های ۲۴ ساعت", value: stats.meals_today, sub: `${faInt(Math.round(stats.photo_share_7d * 100))}٪ با عکس در ۷ روز`, Icon: Utensils, tone: "text-green-ink bg-mint" },
    { label: "فراخوانی AI در ۲۴ ساعت", value: stats.ai_calls_24h, sub: "خواندن وعده و تست اتصال", Icon: Cpu, tone: "text-purple-ink bg-purple-tint" },
    { label: "خطا در ۲۴ ساعت", value: stats.errors_24h, sub: stats.errors_24h ? "بررسی لاگ خطاها" : "بدون خطا", Icon: AlertTriangle, tone: stats.errors_24h ? "text-error bg-[color-mix(in_srgb,var(--error)_10%,transparent)]" : "text-ink-2 bg-track" },
    { label: "کاربران مسدود", value: stats.blocked, sub: "از صفحه کاربران", Icon: Ban, tone: "text-ink-2 bg-track" },
  ];

  return (
    <>
      <PageHeader title="داشبورد" sub="وضعیت کلی Nutivo در یک نگاه" />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(({ label, value, sub, Icon, tone }) => (
          <li key={label} className="rounded-[var(--radius-card)] border border-line bg-surface p-3.5 shadow-[var(--shadow-soft)]">
            <span className={`mb-2 grid size-8 place-items-center rounded-full ${tone}`}><Icon size={16} strokeWidth={2} aria-hidden /></span>
            <p className="text-xs text-ink-2">{label}</p>
            <p className="tabular text-2xl font-bold">{faInt(value)}</p>
            <p className="mt-0.5 text-[11px] text-ink-2">{sub}</p>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="آخرین خطاها" action={<Link href="/admin/logs?level=error" className="text-sm text-green-ink hover:underline">همه</Link>}>
          {errors.rows.length === 0 ? (
            <p className="text-sm text-ink-2">خطایی ثبت نشده.</p>
          ) : (
            <ul className="divide-y divide-line">
              {errors.rows.map((r) => (
                <li key={r.id} className="grid gap-1 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <LevelPill level={r.level} />
                    <EventCode>{r.event}</EventCode>
                    <span className="ms-auto text-xs text-ink-2">{faAgo(r.at)}</span>
                  </div>
                  <p className="truncate text-sm">{r.message ?? EVENT_FA[r.event] ?? "—"}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="جدیدترین کاربران" action={<Link href="/admin/users" className="text-sm text-green-ink hover:underline">همه</Link>}>
          <ul className="divide-y divide-line">
            {users.rows.slice(0, 5).map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-green-ink">
                  <span dir="ltr" className="truncate text-sm">{u.email}</span>
                  <span className="shrink-0 text-xs text-ink-2">{faAgo(u.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
