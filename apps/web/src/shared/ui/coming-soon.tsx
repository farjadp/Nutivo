import type { LucideIcon } from "lucide-react";
import { BottomNav } from "@/features/today/ui/bottom-nav";

export function ComingSoon({ title, active, Icon, ai = false, body, when }: { title: string; active: string; Icon: LucideIcon; ai?: boolean; body: string; when: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[max(20px,env(safe-area-inset-top))] pb-28">
        <h1 className="text-2xl font-bold">{title}</h1>
        <section className={`mt-5 grid justify-items-start gap-3 rounded-[var(--radius-card)] p-5 ${ai ? "bg-purple-tint" : "border border-line bg-surface shadow-[var(--shadow-soft)]"}`}>
          <span className={`grid size-11 place-items-center rounded-full ${ai ? "bg-surface text-purple-ink" : "bg-mint text-green-ink"}`}>
            <Icon size={22} strokeWidth={1.75} aria-hidden />
          </span>
          <p className="text-[15px] leading-7">{body}</p>
          <p className="text-xs text-ink-2">{when}</p>
        </section>
      </main>
      <div className="fixed inset-x-0 bottom-0 bg-surface pb-[env(safe-area-inset-bottom)]">
        <BottomNav active={active} />
      </div>
    </div>
  );
}
