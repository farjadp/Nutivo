"use client";
import { Check, Copy, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { createLinkCodeAction, type LinkCodeResult } from "../api/link-actions";

/** «من» row: get a one-time code (or a deep link) that connects this account to the Telegram bot. */
export function TelegramLink({ linkedAs }: { linkedAs: string | null }) {
  const [res, setRes] = useState<LinkCodeResult | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

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
          <span className="block text-xs text-ink-2">{linkedAs ? `وصل است${linkedAs ? ` · ${linkedAs}` : ""}` : "ثبت وعده و گزارش شبانه در تلگرام"}</span>
        </span>
        {!res?.ok && (
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => setRes(await createLinkCodeAction()))}
            className="rounded-[var(--radius-btn)] border border-green-ink px-3 py-1.5 text-[13px] font-semibold text-green-ink hover:bg-mint disabled:opacity-50"
          >
            {pending ? "…" : linkedAs ? "اتصال دوباره" : "اتصال"}
          </button>
        )}
      </div>
      {res && !res.ok && <p role="alert" className="mt-2 text-xs text-error">{res.error}</p>}
      {res?.ok && (
        <div className="animate-rise mt-3 grid gap-2 rounded-[var(--radius-btn)] bg-ground p-3">
          {res.url ? (
            <a href={res.url} target="_blank" rel="noreferrer" className="h-10 rounded-[var(--radius-btn)] bg-green-ink text-center text-sm font-semibold leading-10 text-surface">
              باز کردن بات و اتصال
            </a>
          ) : null}
          <p className="text-xs text-ink-2">یا این را در بات بفرست (تا ۱۵ دقیقه معتبر است):</p>
          <div className="flex items-center gap-2">
            <code dir="ltr" className="tabular flex-1 rounded-[8px] bg-surface px-3 py-2 text-center font-[family-name:var(--font-en)] text-base font-semibold tracking-widest">/link {res.code}</code>
            <button type="button" onClick={() => void copy(`/link ${res.code}`)} aria-label="کپی" className="grid size-10 place-items-center rounded-[8px] text-ink-2 hover:bg-track">
              {copied ? <Check size={18} strokeWidth={2} className="text-success" /> : <Copy size={18} strokeWidth={1.75} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
