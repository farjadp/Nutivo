"use client";
import { useEffect, useState } from "react";

const KEY = "nutivo.nuti.enabled";

/** Per-browser preference: show نوتی or the plain Insight card. Defaults to on. */
export function useNutiEnabled(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      setOn(window.localStorage.getItem(KEY) !== "off");
    } catch {
      // storage blocked: keep default
    }
  }, []);
  const set = (v: boolean) => {
    setOn(v);
    try {
      window.localStorage.setItem(KEY, v ? "on" : "off");
    } catch {
      // ignore
    }
  };
  return [on, set];
}
