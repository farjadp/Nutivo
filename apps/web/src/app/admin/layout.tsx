import { ArrowRight } from "lucide-react";
import { Logo } from "@/shared/ui/logo";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/features/admin/api/guard.server";
import { AdminNav } from "@/features/admin/ui/admin-nav";

export const metadata = { title: "ادمین · Nutivo", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await requireAdmin();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="border-b border-line bg-surface px-3 py-3 lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-l lg:px-4 lg:py-6">
        <div className="mb-3 flex items-center justify-between gap-2 px-1 lg:mb-6 lg:block">
          <p className="flex items-center gap-2">
            <Logo className="h-12" />
            <span className="text-xs text-ink-2">ادمین</span>
          </p>
          <Link href="/today" className="flex items-center gap-1 text-xs text-ink-2 hover:text-ink lg:mt-1">
            <ArrowRight size={14} strokeWidth={2} aria-hidden />
            برگشت به اپ
          </Link>
        </div>
        <AdminNav />
        <div className="mt-3 hidden px-1 text-xs leading-6 text-ink-2 lg:mt-8 lg:block">
          {ctx.mode === "review" ? "حالت بررسی، بدون ورود" : <span dir="ltr">{ctx.email}</span>}
        </div>
      </aside>
      <main className="min-w-0 px-4 py-5 lg:px-8 lg:py-8">
        {!ctx.live && (
          <p role="status" className="mb-5 rounded-[var(--radius-btn)] border border-dashed border-fat bg-[color-mix(in_srgb,var(--fat)_8%,transparent)] px-3 py-2 text-[13px] leading-6">
            <strong className="font-semibold">داده نمونه.</strong> برای دیدن کاربران و لاگ واقعی، <code dir="ltr" className="font-[family-name:var(--font-en)]">SUPABASE_SERVICE_ROLE_KEY</code> را در <code dir="ltr" className="font-[family-name:var(--font-en)]">apps/web/.env.local</code> بگذار. دکمه‌های مدیریت تا آن موقع کار نمی‌کنند.
          </p>
        )}
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
