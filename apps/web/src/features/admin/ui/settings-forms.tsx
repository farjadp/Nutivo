"use client";
import { Eye, EyeOff, KeyRound, PlugZap, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { clearSecretAction, saveSecretAction, saveValueAction, testProviderAction, type AdminResult } from "../api/actions";

function Result({ res }: { res: AdminResult | null }) {
  if (!res) return null;
  return <p role="status" className={`text-xs ${res.ok ? "text-success" : "text-error"}`}>{res.ok ? res.message : res.error}</p>;
}

export interface ProviderView {
  id: "anthropic" | "openai" | "google";
  name: string;
  use: string;
  secretKey: string;
  source: "panel" | "env" | "none";
  last4: string | null;
  updatedAt: string | null;
  placeholder: string;
  docs: string;
}

export function ProviderCard({ p, live }: { p: ProviderView; live: boolean }) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [res, setRes] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<AdminResult>) => start(async () => setRes(await fn()));

  const badge =
    p.source === "panel" ? (
      <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold text-green-ink">از پنل · …{p.last4}</span>
    ) : p.source === "env" ? (
      <span className="rounded-full bg-track px-2 py-0.5 text-[11px] font-semibold text-ink-2">از env · …{p.last4}</span>
    ) : (
      <span className="rounded-full bg-[color-mix(in_srgb,var(--fat)_14%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-fat-ink">تنظیم نشده</span>
    );

  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <KeyRound size={18} strokeWidth={1.75} className="text-ink-2" aria-hidden />
          <span dir="ltr" className="font-[family-name:var(--font-en)]">{p.name}</span>
        </h3>
        {badge}
      </header>
      <p className="mt-1 text-xs leading-6 text-ink-2">{p.use}</p>

      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const r = await saveSecretAction(p.secretKey, value);
            if (r.ok) setValue("");
            return r;
          });
        }}
      >
        <label htmlFor={`k-${p.id}`} className="sr-only">کلید {p.name}</label>
        <div className="flex min-w-[240px] flex-1 items-center rounded-[var(--radius-btn)] border border-line bg-surface focus-within:border-green">
          <input
            id={`k-${p.id}`}
            type={show ? "text" : "password"}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={p.source === "none" ? p.placeholder : "کلید جدید برای جایگزینی"}
            className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-ink-2"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="grid size-10 place-items-center text-ink-2" aria-label={show ? "پنهان کن" : "نمایش"}>
            {show ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
          </button>
        </div>
        <button type="submit" disabled={!live || pending || value.trim().length < 16} className="h-10 rounded-[var(--radius-btn)] bg-green-ink px-4 text-sm font-semibold text-surface disabled:opacity-45">
          ذخیره
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending || p.source === "none"} onClick={() => run(() => testProviderAction(p.id))} className="flex h-9 items-center gap-1.5 rounded-[var(--radius-btn)] border border-line px-3 text-sm hover:border-green disabled:opacity-45">
          <PlugZap size={15} strokeWidth={1.75} aria-hidden /> تست اتصال
        </button>
        {p.source === "panel" && (
          <button type="button" disabled={!live || pending} onClick={() => run(() => clearSecretAction(p.secretKey))} className="flex h-9 items-center gap-1.5 rounded-[var(--radius-btn)] px-3 text-sm text-error hover:bg-[color-mix(in_srgb,var(--error)_8%,transparent)] disabled:opacity-45">
            <Trash2 size={15} strokeWidth={1.75} aria-hidden /> حذف کلید
          </button>
        )}
        <a href={p.docs} target="_blank" rel="noreferrer" className="ms-auto text-xs text-ink-2 hover:text-ink">گرفتن کلید ↗</a>
      </div>
      <div className="mt-2"><Result res={res} /></div>
    </section>
  );
}

export function ValueField({ settingKey, label, hint, initial, live, inputMode }: { settingKey: string; label: string; hint: string; initial: string; live: boolean; inputMode?: "numeric" }) {
  const [value, setValue] = useState(initial);
  const [res, setRes] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setRes(await saveValueAction(settingKey, value)));
      }}
    >
      <label htmlFor={settingKey} className="text-sm font-semibold">{label}</label>
      <div className="flex gap-2">
        <input id={settingKey} dir="ltr" inputMode={inputMode} value={value} onChange={(e) => setValue(e.target.value)} className="h-10 min-w-0 flex-1 rounded-[var(--radius-btn)] border border-line bg-surface px-3 text-sm focus:border-green focus:outline-none" />
        <button type="submit" disabled={!live || pending || value === initial} className="h-10 rounded-[var(--radius-btn)] border border-line px-3 text-sm hover:border-green disabled:opacity-45">ذخیره</button>
      </div>
      <p className="text-xs text-ink-2">{hint}</p>
      <Result res={res} />
    </form>
  );
}
