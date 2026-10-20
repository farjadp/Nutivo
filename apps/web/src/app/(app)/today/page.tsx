import { SAMPLE_GOALS, SAMPLE_ITEMS, SAMPLE_LOG_DATES, SAMPLE_TODAY } from "@/entities/day/sample";
import { loadDay } from "@/features/today/api/load-day.server";
import { TodayView } from "@/features/today/ui/today-view";
import { isSupabaseConfigured } from "@/shared/config";

export const metadata = { title: "امروز · Nutivo" };
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  if (!isSupabaseConfigured()) {
    // No backend yet: labelled sample data so the screen can be reviewed.
    return <TodayView today={SAMPLE_TODAY} initialItems={SAMPLE_ITEMS} goals={SAMPLE_GOALS} pastLogDates={SAMPLE_LOG_DATES} isSample />;
  }
  const day = await loadDay();
  return <TodayView today={day.today} initialItems={day.items} goals={day.goals} pastLogDates={day.pastLogDates} isSample={false} />;
}
