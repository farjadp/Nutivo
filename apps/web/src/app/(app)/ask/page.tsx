import { AskView } from "@/features/ask/ui/ask-view";
import { isAuthDisabled, isSupabaseConfigured } from "@/shared/config";

export const metadata = { title: "بپرس · Nutivo" };
export const dynamic = "force-dynamic";

export default function AskPage() {
  return <AskView mode={!isSupabaseConfigured() ? "sample" : isAuthDisabled() ? "local" : "live"} />;
}
