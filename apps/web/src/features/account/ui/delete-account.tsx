"use client";
import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { deleteAccountAction, type DeleteAccountState } from "../api/actions";

/** «حذف حساب» row. Opens an explanation and a field where the user types «حذف» before anything is removed. */
export function DeleteAccount({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(deleteAccountAction, {});
  const ready = typed.trim() === "حذف";

  return (
    <div className="px-4 py-3.5">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 text-start">
        <span className="grid size-9 place-items-center rounded-full bg-error/10 text-error"><Trash2 size={17} strokeWidth={2} aria-hidden /></span>
        <span className="flex-1 text-[15px] font-semibold text-error">حذف حساب</span>
      </button>
      {open && (
        <form action={action} className="animate-rise mt-3 grid gap-3 rounded-[var(--radius-btn)] bg-ground p-3">
          <p className="text-sm leading-7 text-ink-2">
            این کار برگشت ندارد. حساب <bdi dir="ltr">{email ?? ""}</bdi> و هر چه در آن است برای همیشه پاک می‌شود: وعده‌ها، عکس غذاها، گزارش‌ها، پروفایل و هدف‌ها، و اتصال بات تلگرام.
          </p>
          <label htmlFor="delete-confirm" className="text-sm font-semibold">برای تأیید، بنویس «حذف»</label>
          <input id="delete-confirm" name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="h-11 rounded-[var(--radius-btn)] border border-line bg-surface px-3 text-[15px] outline-none focus:border-green" />
          {state.error && <p role="alert" className="text-sm text-error">{state.error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={!ready || pending} className="h-11 flex-1 rounded-[var(--radius-btn)] bg-error text-sm font-semibold text-surface disabled:opacity-40">
              {pending ? "در حال حذف…" : "حذف همیشگی حساب"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-[var(--radius-btn)] px-4 text-sm font-semibold text-green-ink hover:bg-mint">
              نه، برگرد
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
