import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type Me } from "./api";
import { supabase } from "./supabase";

interface SessionState {
  ready: boolean;
  session: Session | null;
  me: Me | null;
  /** The account is being fetched (right after sign-in or a retry). */
  loadingMe: boolean;
  /** Last error loading the account, shown with a retry. */
  error: string | null;
  refreshMe: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Switches نوتی on or off for this account (web and bot follow). Returns an error message on failure. */
  setNuti: (on: boolean) => Promise<string | null>;
  /** Remembers the «حالت شیطان» switch after the server saved it. */
  setNakhonakFlag: (on: boolean) => void;
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);

  const loadMe = useCallback(async (s: Session | null) => {
    if (!s) {
      setMe(null);
      return;
    }
    setLoadingMe(true);
    const r = await api.me();
    setLoadingMe(false);
    if (r.ok) {
      setMe(r.data);
      setError(null);
    } else if (r.code === "not_linked") {
      // Token no longer valid (signed out elsewhere, user removed): back to login on this device only.
      await supabase.auth.signOut({ scope: "local" });
      // No SIGNED_OUT event fires when the stored session is already dead, so clear it here.
      setSession(null);
      setMe(null);
    } else {
      setError(r.error);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadMe(data.session);
      if (alive) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void loadMe(s);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadMe]);

  const setNuti = useCallback(async (on: boolean) => {
    // Show the change at once; put it back if the server didn't take it.
    setMe((m) => (m ? { ...m, nuti_enabled: on } : m));
    const r = await api.prefs({ nuti_enabled: on });
    if (r.ok) return null;
    setMe((m) => (m ? { ...m, nuti_enabled: !on } : m));
    return r.error;
  }, []);

  const value: SessionState = {
    ready,
    session,
    me,
    loadingMe,
    error,
    refreshMe: () => loadMe(session),
    // Local scope: signing out here must not end the session on the user's other devices.
    signOut: async () => {
      await supabase.auth.signOut({ scope: "local" });
      setSession(null);
      setMe(null);
    },
    setNuti,
    setNakhonakFlag: (on: boolean) => setMe((m) => (m ? { ...m, nakhonak_enabled: on } : m)),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}
