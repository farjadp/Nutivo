import { SAMPLE_GOALS, SAMPLE_ITEMS, SAMPLE_TODAY } from "@/entities/day/sample";
import { readReport } from "@/features/report/api/report.server";
import { ReportView } from "@/features/report/ui/report-view";
import { loadDay } from "@/features/today/api/load-day.server";
import { createClient } from "@/lib/supabase/server";
import { isAuthDisabled, isSupabaseConfigured } from "@/shared/config";

export const metadata = { title: "گزارش · Nutivo" };
export const dynamic = "force-dynamic";

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  if (!isSupabaseConfigured()) {
    return <ReportView mode="sample" today={SAMPLE_TODAY} date={SAMPLE_TODAY} items={SAMPLE_ITEMS} goals={SAMPLE_GOALS} />;
  }
  if (isAuthDisabled()) {
    // Review mode: the browser holds the days; the view loads them on mount.
    return <ReportView mode="local" today={SAMPLE_TODAY} date={SAMPLE_TODAY} items={[]} goals={SAMPLE_GOALS} />;
  }
  const { d } = await searchParams;
  const day = await loadDay(d);
  const stored = await readReport(await createClient(), day.userId, day.date);
  return (
    <ReportView
      mode="live"
      today={day.today}
      date={day.date}
      items={day.items}
      goals={day.goals}
      stats={day.stats}
      stored={{ analysis: stored.analysis, hash: stored.source_hash }}
    />
  );
}
