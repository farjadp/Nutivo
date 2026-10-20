import { FileText } from "lucide-react";
import { ComingSoon } from "@/shared/ui/coming-soon";

export const metadata = { title: "گزارش · Nutivo" };

export default function Page() {
  return (
    <ComingSoon
      title="گزارش"
      active="/report"
      Icon={FileText}
      body="هر شب ساعت ۲۱:۳۰ گزارش کامل روز اینجا می‌آید: جمع کالری و ماکروها، جدول همه خوراکی‌ها، پرکالری‌ترین وعده و پیشنهاد برای فردا."
      when="در هفته ۲ ساخته می‌شود."
    />
  );
}
