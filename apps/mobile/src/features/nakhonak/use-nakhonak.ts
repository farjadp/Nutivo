import type { AppNakhonak } from "@nutivo/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

/** ناخنک's state for one screen: load, answer today's story, switch the mode on or off. */
export function useNakhonak() {
  const { setNakhonakFlag } = useSession();
  const [state, setState] = useState<AppNakhonak | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const alive = useRef(true);
  // Set on every mount: React's development double-mount runs the cleanup once in between.
  useEffect(() => {
    alive.current = true;
    return () => void (alive.current = false);
  }, []);

  const load = useCallback(async () => {
    const r = await api.nakhonak();
    if (!alive.current) return;
    if (r.ok) {
      setState(r.data);
      setError(null);
    } else setError(r.error);
  }, []);

  /** `choice` is a story choice id, "x" for «امروز حوصله ندارم», or "ok" for the chapter. */
  const answer = useCallback(async (choice: string) => {
    const today = state?.today;
    if (!today || busy) return;
    setBusy(choice);
    const r = await api.nakhonakAnswer(today.date, choice);
    if (!alive.current) return;
    setBusy(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setState((s) => (s ? { ...s, today: r.data } : s));
    // Score and traps changed: refresh the dossier part quietly.
    void api.nakhonak().then((p) => alive.current && p.ok && setState((s) => (s ? { ...s, progress: p.data.progress } : s)));
  }, [state, busy]);

  const setEnabled = useCallback(async (on: boolean) => {
    setBusy("toggle");
    const r = await api.nakhonakPrefs(on);
    if (!alive.current) return null;
    setBusy(null);
    if (!r.ok) return r.error;
    setState(r.data);
    setNakhonakFlag(on);
    return null;
  }, [setNakhonakFlag]);

  return { state, error, busy, load, answer, setEnabled };
}
