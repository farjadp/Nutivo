"use client";
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { setNutiAction } from "@/features/account/api/actions";

const KEY = "nutivo.nuti.enabled";

/** Signed in: the account's setting from the server (`saved`), so web, app and bot agree. Review mode: per browser. */
const Ctx = createContext<{ saved: boolean | null }>({ saved: null });

export function NutiPrefProvider({ saved, children }: { saved: boolean | null; children: ReactNode }) {
  return createElement(Ctx.Provider, { value: { saved } }, children);
}

/** Whether to show نوتی or the plain Insight card. Defaults to on. */
export function useNutiEnabled(): [boolean, (v: boolean) => void] {
  const { saved } = useContext(Ctx);
  const [on, setOn] = useState(saved ?? true);
  useEffect(() => {
    if (saved !== null) return setOn(saved);
    try {
      setOn(window.localStorage.getItem(KEY) !== "off");
    } catch {
      // storage blocked: keep default
    }
  }, [saved]);
  const set = (v: boolean) => {
    setOn(v);
    if (saved !== null) {
      // Show the change at once; put it back if the server didn't take it.
      void setNutiAction(v).then((ok) => {
        if (!ok) setOn(!v);
      });
      return;
    }
    try {
      window.localStorage.setItem(KEY, v ? "on" : "off");
    } catch {
      // ignore
    }
  };
  return [on, set];
}
