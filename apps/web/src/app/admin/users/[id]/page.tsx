import { ArrowRight, Camera } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser, listLogs, listUserMeals, pageParam } from "@/features/admin/api/data.server";
import { requireAdmin } from "@/features/admin/api/guard.server";
import { AdminBadge, Panel, StatusPill } from "@/features/admin/ui/bits";
import { LogTable } from "@/features/admin/ui/log-table";
import { UserActions } from "@/features/admin/ui/user-actions";
import { faAgo, faDateTime, faInt } from "@/shared/lib/format";
import { Pagination } from "@/shared/ui/pagination";

type SP = Promise<Record<string, string | string[] | undefined>>;
const MEAL_FA: Record<string, string> = { breakfast: "صبحانه", lunch: "ناهار", snack: "میان‌وعده", dinner: "شام" };
const ACT_FA: Record<string, string> = { sedentary: "کم‌تحرک", light: "سبک", moderate: "متوسط", active: "فعال", very_active: "خیلی فعال" };
const GOAL_FA: Record<string, string> = { lose: "کاهش تدریجی", maintain: "حفظ وزن", gain: "افزایش" };

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <dt className="text-ink-2">{k}</dt>
      <dd className="tabular text-left">{v}</dd>
    </div>
  );
}

export default async function UserDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const mp = pageParam(sp.mp);
  const lp = pageParam(sp.lp);
  const found = await getUser(ctx, id);
  if (!found) notFound();
  const { user, profile } = found;
  const [meals, logs] = await Promise.all([listUserMeals(ctx, id, mp), listLogs(ctx, { actor: ctx.live ? id : user.email }, lp, 10)]);
  const keep = { mp: mp > 1 ? String(mp) : undefined, lp: lp > 1 ? String(lp) : undefined };

  return (
    <>
      <Link href="/admin/users" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowRight size={16} strokeWidth={2} aria-hidden /> کاربران
      </Link>
      <header className="mb-5 flex flex-wrap items-center gap-2">
        <h1 dir="ltr" className="text-2xl font-bold">{user.email}</h1>
        <StatusPill status={user.status} />
        {user.is_admin && <AdminBadge />}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="حساب">
          <dl className="divide-y divide-line">
            <Row k="ثبت‌نام" v={faDateTime(user.created_at)} />
            <Row k="آخرین ورود" v={faAgo(user.last_sign_in_at)} />
            <Row k="کل وعده‌ها" v={faInt(user.meals_total)} />
            <Row k="وعده ۷ روز" v={faInt(user.meals_7d)} />
            <Row k="آخرین وعده" v={faAgo(user.last_meal_at)} />
          </dl>
        </Panel>
        <Panel title="پروفایل و اهداف">
          {profile?.goal_kcal ? (
            <dl className="divide-y divide-line">
              <Row k="هدف" v={GOAL_FA[profile.goal as string] ?? "—"} />
              <Row k="کالری" v={faInt(profile.goal_kcal)} />
              <Row k="پروتئین / کربو / چربی" v={`${faInt(profile.goal_protein_g)} / ${faInt(profile.goal_carbs_g)} / ${faInt(profile.goal_fat_g)} گرم`} />
              <Row k="قد، وزن، سن" v={`${faInt(profile.height_cm)} سانت · ${faInt(profile.weight_kg)} کیلو · ${faInt(profile.age)}`} />
              <Row k="فعالیت" v={ACT_FA[profile.activity as string] ?? "—"} />
              <Row k="منطقه زمانی" v={<span dir="ltr">{profile.timezone}</span>} />
            </dl>
          ) : (
            <p className="text-sm text-ink-2">هنوز پروفایل را کامل نکرده.</p>
          )}
        </Panel>
        <Panel title="مدیریت">
          <UserActions userId={user.id} email={user.email} isAdmin={user.is_admin} blocked={user.status === "blocked"} isSelf={user.id === ctx.userId} live={ctx.live} />
        </Panel>
      </div>

      <Panel title="وعده‌ها" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-line text-right text-xs text-ink-2">
                <th className="py-2 pe-3 font-medium">زمان</th>
                <th className="py-2 pe-3 font-medium">وعده</th>
                <th className="py-2 pe-3 font-medium">ورودی</th>
                <th className="py-2 pe-3 font-medium">آیتم</th>
                <th className="py-2 font-medium">کالری</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {meals.rows.map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5 pe-3 text-ink-2" title={faDateTime(m.eaten_at)}>{faAgo(m.eaten_at)}</td>
                  <td className="py-2.5 pe-3">{MEAL_FA[m.meal_type] ?? m.meal_type}</td>
                  <td className="max-w-[320px] py-2.5 pe-3">
                    <span className="flex items-center gap-1.5 truncate">
                      {m.input_channel === "web_photo" && <Camera size={14} strokeWidth={2} className="shrink-0 text-ink-2" aria-label="عکس" />}
                      {m.raw_input || "—"}
                    </span>
                  </td>
                  <td className="tabular py-2.5 pe-3">{faInt(m.items)}</td>
                  <td className="tabular py-2.5 font-semibold">{faInt(m.kcal)}</td>
                </tr>
              ))}
              {meals.rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-ink-2">وعده‌ای ثبت نشده.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={meals.page} pageSize={meals.pageSize} total={meals.total} params={keep} param="mp" basePath={`/admin/users/${id}`} label="وعده" />
      </Panel>

      <Panel title="فعالیت‌های این کاربر" className="mt-4">
        <LogTable rows={logs.rows} showActor={false} />
        <Pagination page={logs.page} pageSize={logs.pageSize} total={logs.total} params={keep} param="lp" basePath={`/admin/users/${id}`} label="رویداد" />
      </Panel>
    </>
  );
}
