import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { api, type MealType } from "./api";
import { DEFAULT_PREFS, ensurePermission, loadPrefs, reschedule, savePrefs, type ReminderKey, type ReminderPrefs } from "./reminders";
import { useSession } from "./session";
import { useUndo } from "./undo";

// While the app is open, still show the banner (the user may be on another tab).
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

interface RemindersState {
  prefs: ReminderPrefs;
  /** Turn one reminder on or off, or move its time. Returns "denied" when notifications are blocked. */
  update: (key: ReminderKey, change: Partial<ReminderPrefs[ReminderKey]>) => Promise<"ok" | "denied">;
  /** Move a reminder's time by `by` minutes, from the latest value (quick taps don't get lost). */
  shift: (key: ReminderKey, by: number) => Promise<void>;
}

const Ctx = createContext<RemindersState | null>(null);

/** Taps already acted on: the last response stays readable, so a remount (sign out and in) must not replay it. */
const handled = new Set<string>();

/** Signed-in only: keeps the schedule in step with today's meals and opens the right screen on a tap. */
export function RemindersProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_PREFS);
  const prefsRef = useRef(prefs);
  const nuti = useSession().me?.nuti_enabled ?? true;
  const { version } = useUndo();

  const sync = useCallback(
    async (p: ReminderPrefs) => {
      const day = await api.day();
      const today = day.ok ? { date: day.data.day.today, logged: new Set<MealType>(day.data.items.map((i) => i.meal_type)) } : undefined;
      await reschedule(p, { nuti, today });
    },
    [nuti],
  );

  // On open, after every save or undo (version), and when the app comes back to the foreground.
  useEffect(() => {
    void loadPrefs().then((p) => {
      prefsRef.current = p;
      setPrefs(p);
      void sync(p);
    });
  }, [sync, version]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && void sync(prefsRef.current));
    return () => sub.remove();
  }, [sync]);

  // A tap on a reminder opens the log sheet; on the nightly one, the report.
  useEffect(() => {
    const open = (n: Notifications.Notification) => {
      if (handled.has(n.request.identifier)) return;
      handled.add(n.request.identifier);
      const url = n.request.content.data?.url;
      if (typeof url === "string") router.push(url as Href);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      open(last.notification);
      Notifications.clearLastNotificationResponse();
    }
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    return () => sub.remove();
  }, []);

  const update = useCallback<RemindersState["update"]>(
    async (key, change) => {
      if (change.on && (await ensurePermission()) === "denied") return "denied";
      const next = { ...prefsRef.current, [key]: { ...prefsRef.current[key], ...change } };
      prefsRef.current = next;
      setPrefs(next);
      await savePrefs(next);
      await sync(next);
      return "ok";
    },
    [sync],
  );

  const shift = useCallback<RemindersState["shift"]>(
    async (key, by) => {
      const day = 24 * 60;
      await update(key, { minutes: (prefsRef.current[key].minutes + by + day) % day });
    },
    [update],
  );

  return <Ctx.Provider value={{ prefs, update, shift }}>{children}</Ctx.Provider>;
}

export function useReminders(): RemindersState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useReminders outside RemindersProvider");
  return v;
}
