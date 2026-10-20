import { getMetrics } from "@/features/admin/api/data.server";
import { requireAdmin } from "@/features/admin/api/guard.server";
import { PageHeader, Panel } from "@/features/admin/ui/bits";
import { aiCost, CohortTable, CostChart, faUsd, FrequencyChart, RetentionKpis } from "@/features/admin/ui/metrics";
import { aiPrices } from "@/shared/config";
import { faInt } from "@/shared/lib/format";

export const metadata = { title: "متریک‌ها · ادمین Nutivo" };
export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = { "ai.extract": "خواندن وعده", "ai.report": "گزارش شبانه", "ai.ask": "بپرس" };

export default async function MetricsPage() {
  const ctx = await requireAdmin();
  const { metrics: m } = await getMetrics(ctx);
  if (!m) {
    return (
      <>
        <PageHeader title="متریک‌ها" />
        <Panel><p className="text-sm text-ink-2">برای متریک‌ها اتصال سرویس (SUPABASE_SERVICE_ROLE_KEY) لازم است.</p></Panel>
      </>
    );
  }
  const price = aiPrices();
  const cost = aiCost(m, price);
  const freqShare = m.frequency.active_7d ? m.frequency.four_plus / m.frequency.active_7d : 0;

  return (
    <>
      <PageHeader title="متریک‌ها" sub="نگهداشت از اولین روز ثبت هر کاربر (روز صفر)، به وقت محلی خودش." />
      <RetentionKpis m={m} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="کوهورت‌های هفتگی">
          <CohortTable m={m} />
          <p className="mt-2 text-[11px] leading-5 text-ink-2">Dn: درصد کسانی که n روز بعد از روز صفر دوباره ثبت کرده‌اند. خانه خاکستری یعنی هنوز کسی از آن هفته به آن روز نرسیده.</p>
        </Panel>

        <Panel title="روزهای ثبت در ۷ روز اخیر">
          <p className="tabular text-sm">
            میانگین <strong>{new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(m.frequency.avg_days)}</strong> روز از ۷ ·{" "}
            <strong className={freqShare >= 0.5 ? "text-success" : "text-fat-ink"}>{faInt(freqShare * 100)}٪</strong> از {faInt(m.frequency.active_7d)} کاربر فعال، ۴ روز یا بیشتر
          </p>
          <div className="mt-3"><FrequencyChart m={m} /></div>
          <p className="mt-2 text-[11px] text-ink-2">خط‌چین: معیار موفقیت طرح (حداقل ۴ روز در هفته).</p>
        </Panel>

        <Panel title="هزینه هوش مصنوعی، ۱۴ روز" className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,22rem)]">
            <div>
              <p className="tabular text-2xl font-bold">{faUsd(cost.total)}</p>
              <p className="tabular text-xs text-ink-2">
                {m.frequency.active_7d ? `حدود ${faUsd(cost.total / Math.max(1, m.frequency.active_7d))} برای هر کاربر فعال` : ""}
                {price.assumed && " · قیمت فرضی (۳ و ۱۵ دلار برای هر میلیون توکن)؛ NUTIVO_AI_PRICE_IN و NUTIVO_AI_PRICE_OUT را تنظیم کن."}
              </p>
              <div className="mt-3"><CostChart days={cost.days} /></div>
            </div>
            <table className="tabular h-fit w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] text-ink-2">
                  <th scope="col" className="py-1.5 text-start font-medium">کار</th>
                  <th scope="col" className="py-1.5 text-left font-medium">فراخوانی</th>
                  <th scope="col" className="py-1.5 text-left font-medium">توکن</th>
                  <th scope="col" className="py-1.5 text-left font-medium">هزینه</th>
                </tr>
              </thead>
              <tbody>
                {[...cost.byEvent.entries()].map(([ev, e]) => (
                  <tr key={ev} className="border-b border-line/60 last:border-0">
                    <th scope="row" className="py-2 text-start font-medium">{EVENT_LABEL[ev] ?? ev}</th>
                    <td className="py-2 text-left">{faInt(e.calls)}</td>
                    <td className="py-2 text-left">{faInt((e.tin + e.tout) / 1000)}K</td>
                    <td className="py-2 text-left">{faUsd(e.usd)}</td>
                  </tr>
                ))}
                {cost.byEvent.size === 0 && (
                  <tr><td colSpan={4} className="py-3 text-center text-ink-2">فراخوانی ثبت نشده.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
