"use client";
import { useState, useTransition } from "react";
import { deleteUserAction, setAdminRoleAction, setUserBlockedAction, type AdminResult } from "../api/actions";
import { ActionButton } from "./action-button";

interface Props {
  userId: string;
  email: string;
  isAdmin: boolean;
  blocked: boolean;
  isSelf: boolean;
  live: boolean;
}

export function UserActions({ userId, email, isAdmin, blocked, isSelf, live }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const [res, setRes] = useState<AdminResult | null>(null);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <ActionButton disabled={!live || (isSelf && isAdmin)} run={() => setAdminRoleAction(userId, !isAdmin)}>
          {isAdmin ? "برداشتن دسترسی ادمین" : "ادمین کن"}
        </ActionButton>
        <ActionButton disabled={!live || isSelf} tone={blocked ? "primary" : "danger"} run={() => setUserBlockedAction(userId, !blocked)}>
          {blocked ? "رفع مسدودیت" : "مسدود کن"}
        </ActionButton>
      </div>

      <div className="rounded-[var(--radius-btn)] border border-error/30 p-3">
        <p className="text-sm font-semibold text-error">حذف کاربر</p>
        <p className="mt-1 text-xs leading-6 text-ink-2">حساب، پروفایل، همه وعده‌ها و عکس‌ها برای همیشه پاک می‌شود. برگشت‌پذیر نیست.</p>
        {!confirming ? (
          <button type="button" disabled={!live || isSelf} onClick={() => setConfirming(true)} className="mt-2 h-9 rounded-[var(--radius-btn)] border border-error/40 px-3 text-sm text-error disabled:opacity-50">
            حذف این کاربر…
          </button>
        ) : (
          <div className="mt-2 grid gap-2">
            <label htmlFor="confirm-email" className="text-xs">برای تأیید، ایمیل کاربر را بنویس: <span dir="ltr" className="font-semibold">{email}</span></label>
            <input id="confirm-email" dir="ltr" value={typed} onChange={(e) => setTyped(e.target.value)} className="h-9 rounded-[var(--radius-btn)] border border-line bg-surface px-2 text-sm" autoComplete="off" />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending || typed.trim().toLowerCase() !== email.toLowerCase()}
                onClick={() => start(async () => setRes(await deleteUserAction(userId, typed)))}
                className="h-9 rounded-[var(--radius-btn)] bg-error px-3 text-sm font-semibold text-surface disabled:opacity-40"
              >
                {pending ? "در حال حذف…" : "حذف برای همیشه"}
              </button>
              <button type="button" onClick={() => { setConfirming(false); setTyped(""); }} className="h-9 rounded-[var(--radius-btn)] px-3 text-sm text-ink-2 hover:bg-track">انصراف</button>
            </div>
            {res && <p role="status" className={`text-xs ${res.ok ? "text-success" : "text-error"}`}>{res.ok ? res.message : res.error}</p>}
          </div>
        )}
      </div>
      {!live && <p className="text-xs text-ink-2">در حالت داده نمونه، دکمه‌ها غیرفعال‌اند.</p>}
    </div>
  );
}
