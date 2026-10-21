import AsyncStorage from "@react-native-async-storage/async-storage";
import { toPersianDigits } from "@nutivo/core";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { MealType } from "./api";

/**
 * Meal reminders and the nightly report nudge, as local notifications scheduled on the phone
 * (no push server needed). Settings live on this device only.
 *
 * Instead of a repeating daily trigger, each reminder is scheduled once per day for the next
 * DAYS_AHEAD days and rebuilt whenever the app opens or a meal is saved, so a reminder for a
 * meal that is already logged today is dropped instead of nagging.
 */

export type ReminderKey = "breakfast" | "lunch" | "dinner" | "report";
export type ReminderPrefs = Record<ReminderKey, { on: boolean; minutes: number }>;

export const REMINDER_KEYS: ReminderKey[] = ["breakfast", "lunch", "dinner", "report"];
export const DEFAULT_PREFS: ReminderPrefs = {
  breakfast: { on: false, minutes: 9 * 60 + 30 },
  lunch: { on: false, minutes: 14 * 60 },
  dinner: { on: false, minutes: 20 * 60 + 30 },
  // The nightly report is written from 21:00 (admin setting); half an hour later it is ready.
  report: { on: false, minutes: 21 * 60 + 30 },
};

const KEY = "nutivo.reminders.v1";
const DAYS_AHEAD = 7;
const CHANNEL = "reminders";

export const hhmm = (minutes: number) =>
  toPersianDigits(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);

export async function loadPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const saved = JSON.parse(raw) as Partial<ReminderPrefs>;
    return Object.fromEntries(REMINDER_KEYS.map((k) => [k, { ...DEFAULT_PREFS[k], ...saved[k] }])) as ReminderPrefs;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function savePrefs(p: ReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}

/** Asks once; returns whether notifications may be shown. Android 13+ only prompts after a channel exists. */
export async function ensurePermission(): Promise<"granted" | "denied"> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: "یادآوری‌ها", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return "granted";
  if (!current.canAskAgain) return "denied";
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted ? "granted" : "denied";
}

/** Text for one reminder. Only نوتی speaks colloquially; with her off the copy is plain (brand rule). */
function content(key: ReminderKey, nuti: boolean, nothingLoggedToday: boolean): { body: string; url: string } {
  if (key === "report") {
    if (nothingLoggedToday) {
      return { body: nuti ? "امروز هنوز چیزی ثبت نکردی؛ قبل از خواب یه سر بزن!" : "امروز هنوز وعده‌ای ثبت نشده.", url: "/log" };
    }
    return { body: nuti ? "گزارش امروزت آماده‌ست! ببین روزت چطور بود." : "گزارش امروز آماده است.", url: "/report" };
  }
  const meal = { breakfast: "صبحانه", lunch: "ناهار", dinner: "شام" }[key];
  return { body: nuti ? `${meal} چی خوردی؟ بگو تا حسابش کنم.` : `${meal} را ثبت کن.`, url: "/log" };
}

interface Today {
  /** The user's today (from the server) and the meals already logged on it. */
  date: string;
  logged: Set<MealType>;
}

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Replaces every scheduled Nutivo notification with the ones these settings call for. */
export async function reschedule(prefs: ReminderPrefs, opts: { nuti: boolean; today?: Today }): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!REMINDER_KEYS.some((k) => prefs[k].on)) return 0;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return 0;

  const now = new Date();
  let count = 0;
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const isToday = d === 0 && opts.today?.date === localDate(day);
    for (const key of REMINDER_KEYS) {
      const p = prefs[key];
      if (!p.on) continue;
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(p.minutes / 60), p.minutes % 60);
      if (at <= now) continue;
      // Already logged today: no reminder for that meal.
      if (isToday && key !== "report" && opts.today!.logged.has(key)) continue;
      const c = content(key, opts.nuti, isToday && opts.today!.logged.size === 0);
      await Notifications.scheduleNotificationAsync({
        content: { title: "Nutivo", body: c.body, data: { url: c.url } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
      count++;
    }
  }
  return count;
}
