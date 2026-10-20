import { ChevronLeft, Shield, Target } from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/features/today/ui/bottom-nav";
import { createClient } from "@/lib/supabase/server";
import { isAuthDisabled, isSupabaseConfigured } from "@/shared/config";

async function canSeeAdmin() {
  if (isAuthDisabled()) return true;
  if (!isSupabaseConfigured()) return false;
  const { data } = await (await createClient()).auth.getUser();
  const admins = (process.env.NUTIVO_ADMIN_EMAILS ?? "").toLowerCase().split(",").map((e) => e.trim());
  return Boolean(data.user?.email && admins.includes(data.user.email.toLowerCase()));
}

export const metadata = { title: "من · Nutivo" };

export default async function MePage() {
  const showAdmin = await canSeeAdmin();
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[max(20px,env(safe-area-inset-top))] pb-28">
        <h1 className="text-2xl font-bold">من</h1>
        <ul className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-soft)]">
          <li>
            <Link href="/onboarding" className="flex items-center gap-3 px-4 py-3.5 hover:bg-mint">
              <span className="grid size-9 place-items-center rounded-full bg-mint text-green-ink"><Target size={18} strokeWidth={2} aria-hidden /></span>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold">پروفایل و اهداف</span>
                <span className="block text-xs text-ink-2">قد، وزن، فعالیت و اهداف روزانه</span>
              </span>
              <ChevronLeft size={18} strokeWidth={1.75} className="text-ink-2" aria-hidden />
            </Link>
          </li>
          {showAdmin && (
            <li className="border-t border-line">
              <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 hover:bg-purple-tint">
                <span className="grid size-9 place-items-center rounded-full bg-purple-tint text-purple-ink"><Shield size={18} strokeWidth={2} aria-hidden /></span>
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold">پنل ادمین</span>
                  <span className="block text-xs text-ink-2">کاربران، لاگ‌ها و کلیدهای API</span>
                </span>
                <ChevronLeft size={18} strokeWidth={1.75} className="text-ink-2" aria-hidden />
              </Link>
            </li>
          )}
        </ul>
      </main>
      <div className="fixed inset-x-0 bottom-0 bg-surface pb-[env(safe-area-inset-bottom)]">
        <BottomNav active="/me" />
      </div>
    </div>
  );
}
