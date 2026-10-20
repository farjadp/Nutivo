import { FileText, House, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";

const TABS = [
  { href: "/today", label: "امروز", Icon: House },
  { href: "/report", label: "گزارش", Icon: FileText },
  { href: "/ask", label: "بپرس", Icon: Sparkles, ai: true },
  { href: "/me", label: "من", Icon: UserRound },
] as const;

export function BottomNav({ active }: { active: string }) {
  return (
    <nav aria-label="ناوبری اصلی" className="border-t border-line bg-surface/95 backdrop-blur-sm">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ href, label, Icon, ...rest }) => {
          const on = href === active;
          const ai = "ai" in rest;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${on ? "text-green-ink" : ai ? "text-purple-ink" : "text-ink-2"}`}
              >
                <Icon size={22} strokeWidth={on ? 2.25 : 1.75} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
