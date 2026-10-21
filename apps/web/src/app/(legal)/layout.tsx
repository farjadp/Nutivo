import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/shared/ui/logo";

const PAGES = [
  ["/privacy", "حریم خصوصی"],
  ["/terms", "شرایط استفاده"],
  ["/support", "پشتیبانی"],
  ["/delete-account", "حذف حساب"],
] as const;

/** Public pages for store reviewers and signed-out visitors: privacy, terms, support, account deletion. */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-2xl gap-8 px-4 pt-[max(24px,env(safe-area-inset-top))] pb-16">
      <header className="grid gap-5">
        <Link href="/login" aria-label="Nutivo" className="w-fit">
          <Logo className="h-14" />
        </Link>
        <nav aria-label="صفحه‌های حقوقی" className="flex flex-wrap gap-2">
          {PAGES.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full border border-line px-3.5 py-2 text-sm text-ink-2 hover:border-green hover:text-green-ink">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="legal grid gap-6">{children}</main>
      <footer className="border-t border-line pt-5 text-sm leading-7 text-ink-2">
        Nutivo محصول <bdi>AshaVid Inc.</bdi> است · نیومارکت، انتاریو، کانادا
      </footer>
    </div>
  );
}
