import type { ReactNode } from "react";
import type { LogRow } from "../model/types";

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-2">{sub}</p>}
      </div>
      {children}
    </header>
  );
}

const LEVEL: Record<LogRow["level"], string> = {
  debug: "bg-track text-ink-2",
  info: "bg-[color-mix(in_srgb,var(--carbs)_12%,transparent)] text-carbs",
  warn: "bg-[color-mix(in_srgb,var(--fat)_14%,transparent)] text-fat-ink",
  error: "bg-[color-mix(in_srgb,var(--error)_12%,transparent)] text-error",
};
const LEVEL_FA: Record<LogRow["level"], string> = { debug: "دیباگ", info: "اطلاع", warn: "هشدار", error: "خطا" };

export function LevelPill({ level }: { level: LogRow["level"] }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${LEVEL[level]}`}>{LEVEL_FA[level]}</span>;
}

export function StatusPill({ status }: { status: "active" | "blocked" }) {
  return status === "blocked" ? (
    <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--error)_12%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-error">مسدود</span>
  ) : (
    <span className="inline-flex rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold text-green-ink">فعال</span>
  );
}

export function AdminBadge() {
  return <span className="inline-flex rounded-full bg-purple-tint px-2 py-0.5 text-[11px] font-semibold text-purple-ink">ادمین</span>;
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Event codes stay Latin and monospace: they are identifiers, not prose. */
export function EventCode({ children }: { children: string }) {
  return (
    <code dir="ltr" className="rounded bg-track px-1.5 py-0.5 font-mono text-[12px] text-ink">
      {children}
    </code>
  );
}

export const EVENT_FA: Record<string, string> = {
  "ai.extract": "خواندن وعده با Claude",
  "ai.extract_failed": "خطای خواندن وعده",
  "ai.test_ok": "تست اتصال موفق",
  "ai.test_failed": "تست اتصال ناموفق",
  "meal.confirmed": "ثبت وعده",
  "meal.draft": "پیش‌نویس وعده",
  "meal.deleted": "حذف وعده",
  "meal.updated": "ویرایش وعده",
  "meal.items_saved": "ذخیره آیتم‌ها",
  "meal.save_failed": "خطای ذخیره وعده",
  "profile.created": "ساخت پروفایل",
  "profile.updated": "ویرایش پروفایل",
  "profile.deleted": "حذف پروفایل",
  "user.blocked": "مسدود شد",
  "user.active": "فعال شد",
  "auth.signup": "ثبت‌نام",
  "auth.signin": "ورود",
  "auth.link_sent": "ارسال لینک ورود",
  "auth.link_failed": "خطای ارسال لینک ورود",
  "admin.role_granted": "دادن دسترسی ادمین",
  "admin.role_revoked": "برداشتن دسترسی ادمین",
  "admin.user_blocked": "مسدود کردن کاربر",
  "admin.user_unblocked": "رفع مسدودیت",
  "admin.user_deleted": "حذف کاربر",
  "settings.updated": "تغییر تنظیمات",
  "settings.secret_saved": "ذخیره کلید API",
  "settings.secret_removed": "حذف کلید API",
};
