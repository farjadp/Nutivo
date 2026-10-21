"use client";
import { Check, Copy, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createLinkCodeAction, type LinkCodeResult } from "../api/link-actions";

/**
 * «من» row. One tap: a one-time code is made and Telegram opens on the bot with it, so the user only
 * presses «Start» there. While the code is out the page re-checks the link and shows «وصل است» by itself.
 */
export function TelegramLink({ linkedAs }: { linkedAs: string | null }) {
  const router = useRouter();
  const [res, setRes] = useState<LinkCodeResult | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const linked = linkedAs !== null;
  const waiting = res?.ok && !linked;

  // Re-read the server page every few seconds until the bot links the account (15 minutes at most).
  useEffect(() => {
    if (!waiting) return;
    const started = Date.now();
    const t = window.setInterval(() => {
      if (Date.now() - started > 15 * 60_000) return window.clearInterval(t);
      router.refresh();
    }, 3000);
    return () => window.clearInterval(t);
  }, [waiting, router]);

  function connect() {
    // Open the tab inside the click, before the await, so the browser doesn't block it as a pop-up.
    const tab = window.open("", "_blank");
    start(async () => {
      const r = await createLinkCodeAction();
      setRes(r);
      if (r.ok && r.url && tab) tab.location.href = r.url;
      else tab?.close();
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked: the code stays visible to type by hand
    }
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-mint text-green-ink"><Send size={17} strokeWidth={2} className="-scale-x-100" aria-hidden /></span>
        <span className="flex-1">
          <span className="block text-[15px] font-semibold">بات تلگرام</span>
          <span className={`block text-xs ${linked ? "text-green-ink" : "text-ink-2"}`} aria-live="polite">
            {linked ? `وصل است${linkedAs ? ` · ${linkedAs}` : ""}` : waiting ? "در تلگرام دکمه Start را بزن…" : "ثبت وعده و گزارش شبانه در تلگرام"}
          </span>
        </span>
        {!waiting && (
          <button
            type="button"
            disabled={pending}
            onClick={connect}
            className={`min-h-10 rounded-[var(--radius-btn)] px-3 text-[13px] font-semibold disabled:opacity-50 ${linked ? "border border-line text-ink-2 hover:bg-track" : "bg-green-ink text-surface hover:opacity-90"}`}
          >
            {pending ? "…" : linked ? "اتصال دوباره" : "اتصال با یک کلیک"}
          </button>
        )}
      </div>
      {res && !res.ok && <p role="alert" className="mt-2 text-xs text-error">{res.error}</p>}
      {waiting && res.ok && (
        <div className="animate-rise mt-3 grid gap-2 rounded-[var(--radius-btn)] bg-ground p-3">
          <p className="text-xs leading-6 text-ink-2">تلگرام باز نشد؟ این را در بات بفرست (تا ۱۵ دقیقه معتبر است):</p>
          <div className="flex items-center gap-2">
            <code dir="ltr" className="tabular flex-1 rounded-[8px] bg-surface px-3 py-2 text-center font-[family-name:var(--font-en)] text-base font-semibold tracking-widest">/link {res.code}</code>
            <button type="button" onClick={() => void copy(`/link ${res.code}`)} aria-label="کپی" className="grid size-10 place-items-center rounded-[8px] text-ink-2 hover:bg-track">
              {copied ? <Check size={18} strokeWidth={2} className="text-success" /> : <Copy size={18} strokeWidth={1.75} />}
            </button>
          </div>
          {res.url && (
            <a href={res.url} target="_blank" rel="noreferrer" className="text-center text-sm font-semibold text-green-ink hover:underline">
              باز کردن دوباره تلگرام
            </a>
          )}
        </div>
      )}
    </div>
  );
}
