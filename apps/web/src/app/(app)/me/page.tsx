import { ChevronLeft, Globe, KeyRound, LogOut, MessageCircle, Phone, Shield, Target } from "lucide-react";
import Link from "next/link";
import { DeleteAccount } from "@/features/account/ui/delete-account";
import { signOutAction } from "@/features/auth/actions";
import { BottomNav } from "@/features/today/ui/bottom-nav";
import { NutiToggle } from "@/features/mascot/ui/nuti-toggle";
import { TelegramLink } from "@/features/bot/ui/telegram-link";
import { adminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAuthDisabled, isSupabaseConfigured } from "@/shared/config";
import { faInt } from "@/shared/lib/format";

async function canSeeAdmin() {
  if (isAuthDisabled()) return true;
  if (!isSupabaseConfigured()) return false;
  const { data } = await (await createClient()).auth.getUser();
  const admins = (process.env.NUTIVO_ADMIN_EMAILS ?? "").toLowerCase().split(",").map((e) => e.trim());
  return Boolean(data.user?.email && admins.includes(data.user.email.toLowerCase()));
}

/** Signed-in user's Telegram link, if any ("@username" or a name). Undefined = not available (review mode). */
async function telegramStatus(): Promise<string | null | undefined> {
  if (isAuthDisabled() || !isSupabaseConfigured() || !isAdminConfigured()) return undefined;
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return undefined;
  const { data: link } = await adminClient().from("telegram_links").select("username, first_name").eq("user_id", data.user.id).maybeSingle();
  return link ? (link.username ? `@${link.username}` : (link.first_name as string) ?? "") : null;
}

/** Email and a one-line goals summary for the account rows. Undefined in review mode. */
async function account(): Promise<{ email: string | null; goals: string | null; hasPassword: boolean } | undefined> {
  if (isAuthDisabled() || !isSupabaseConfigured()) return undefined;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return undefined;
  const { data: p } = await supabase.from("profiles").select("goal_kcal, goal_protein_g").eq("id", data.user.id).maybeSingle();
  return {
    email: data.user.email ?? null,
    goals: p?.goal_kcal ? `${faInt(Number(p.goal_kcal))} کالری · ${faInt(Number(p.goal_protein_g))} گرم پروتئین` : null,
    hasPassword: data.user.user_metadata?.has_password === true,
  };
}

const SUPPORT = [
  { href: "https://t.me/farjadtalks", label: "تلگرام", detail: "@farjadtalks", Icon: MessageCircle },
  { href: "tel:+14376611674", label: "تلفن و واتس‌اپ", detail: "+1 437 661 1674", Icon: Phone },
  { href: "https://www.farjadp.com", label: "وب‌سایت", detail: "farjadp.com", Icon: Globe },
];

export const metadata = { title: "من · Nutivo" };

export default async function MePage() {
  const [showAdmin, tg, me] = await Promise.all([canSeeAdmin(), telegramStatus(), account()]);
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[max(20px,env(safe-area-inset-top))] pb-28">
        <h1 className="text-2xl font-bold">من</h1>
        {me?.email && (
          <p className="mt-1 text-sm text-ink-2">
            وارد شده با <bdi dir="ltr">{me.email}</bdi>
          </p>
        )}
        <ul className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-soft)]">
          <li>
            <Link href={me ? "/me/profile" : "/onboarding"} className="flex items-center gap-3 px-4 py-3.5 hover:bg-mint">
              <span className="grid size-9 place-items-center rounded-full bg-mint text-green-ink"><Target size={18} strokeWidth={2} aria-hidden /></span>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold">پروفایل و اهداف</span>
                <span className="block text-xs text-ink-2">{me?.goals ?? "قد، وزن، فعالیت و اهداف روزانه"}</span>
              </span>
              <ChevronLeft size={18} strokeWidth={1.75} className="text-ink-2" aria-hidden />
            </Link>
          </li>
          {me && (
            <li className="border-t border-line">
              <Link href="/me/password" className="flex items-center gap-3 px-4 py-3.5 hover:bg-mint">
                <span className="grid size-9 place-items-center rounded-full bg-mint text-green-ink"><KeyRound size={18} strokeWidth={2} aria-hidden /></span>
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold">{me.hasPassword ? "عوض کردن رمز" : "گذاشتن رمز (اختیاری)"}</span>
                  <span className="block text-xs text-ink-2">{me.hasPassword ? "ورود با ایمیل و رمز فعال است" : "برای ورود بدون منتظر ماندن برای کد"}</span>
                </span>
                <ChevronLeft size={18} strokeWidth={1.75} className="text-ink-2" aria-hidden />
              </Link>
            </li>
          )}
          <li className="border-t border-line">
            <NutiToggle />
          </li>
          {tg !== undefined && (
            <li className="border-t border-line">
              <TelegramLink linkedAs={tg} />
            </li>
          )}
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

        <h2 className="mt-6 px-1 text-xs text-ink-2">پشتیبانی</h2>
        <ul className="mt-2 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-soft)]">
          {SUPPORT.map(({ href, label, detail, Icon }, i) => (
            <li key={href} className={i ? "border-t border-line" : ""}>
              <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex items-center gap-3 px-4 py-3.5 hover:bg-mint">
                <span className="grid size-9 place-items-center rounded-full bg-mint text-green-ink"><Icon size={17} strokeWidth={2} aria-hidden /></span>
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold">{label}</span>
                  <bdi dir="ltr" className="block text-right text-xs text-ink-2">{detail}</bdi>
                </span>
                <ChevronLeft size={18} strokeWidth={1.75} className="text-ink-2" aria-hidden />
              </a>
            </li>
          ))}
        </ul>

        {me && (
          <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-soft)]">
            {/* Ends the session in this browser only (shared or family computers). */}
            <form action={signOutAction}>
              <button type="submit" className="flex w-full items-center gap-3 px-4 py-3.5 text-start hover:bg-track">
                <span className="grid size-9 place-items-center rounded-full bg-error/10 text-error"><LogOut size={17} strokeWidth={2} aria-hidden /></span>
                <span className="flex-1 text-[15px] font-semibold text-error">خروج از حساب</span>
              </button>
            </form>
            <div className="border-t border-line">
              <DeleteAccount email={me.email} />
            </div>
          </div>
        )}
      </main>
      <div className="fixed inset-x-0 bottom-0 bg-surface pb-[env(safe-area-inset-bottom)]">
        <BottomNav active="/me" />
      </div>
    </div>
  );
}
