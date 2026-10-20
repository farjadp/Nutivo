import { SAMPLE_GOALS, SAMPLE_ITEMS, SAMPLE_LOG_DATES, SAMPLE_TODAY } from "@/entities/day/sample";
import { TodayView } from "@/features/today/ui/today-view";

export const metadata = { title: "امروز · Nutivo" };

export default function TodayPage() {
  // Sample data until Supabase is connected (week 1).
  return <TodayView today={SAMPLE_TODAY} initialItems={SAMPLE_ITEMS} goals={SAMPLE_GOALS} pastLogDates={SAMPLE_LOG_DATES} isSample />;
}
