"use client";
import { Activity, LayoutDashboard, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "داشبورد", Icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "کاربران", Icon: Users },
  { href: "/admin/logs", label: "لاگ‌ها", Icon: Activity },
  { href: "/admin/settings", label: "تنظیمات", Icon: Settings },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <ul className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map(({ href, label, Icon, exact }) => {
        const on = exact ? path === href : path.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={on ? "page" : undefined}
              className={`flex items-center gap-2.5 whitespace-nowrap rounded-[var(--radius-btn)] px-3 py-2 text-sm transition-colors duration-150 ${on ? "bg-mint font-semibold text-green-ink" : "text-ink-2 hover:bg-track hover:text-ink"}`}
            >
              <Icon size={18} strokeWidth={on ? 2.25 : 1.75} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
