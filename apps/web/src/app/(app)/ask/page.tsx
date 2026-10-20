import { Sparkles } from "lucide-react";
import { ComingSoon } from "@/shared/ui/coming-soon";

export const metadata = { title: "بپرس · Nutivo" };

export default function Page() {
  return (
    <ComingSoon
      title="بپرس"
      active="/ask"
      Icon={Sparkles}
      ai
      body="«برای شام چی بخورم؟» Nutivo با توجه به کالری و پروتئینی که امروز مانده، از غذاهایی که معمولاً می‌خوری سه گزینه پیشنهاد می‌دهد."
      when="در هفته ۲ ساخته می‌شود."
    />
  );
}
