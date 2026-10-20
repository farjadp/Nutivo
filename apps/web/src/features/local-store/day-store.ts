"use client";
import type { Goals } from "@nutivo/core";
import { SAMPLE_GOALS, samplePastDays, sampleTodayItems, type LoggedItem } from "@/entities/day/sample";
import { addDays } from "@/shared/lib/format";

/**
 * Browser-only storage for review mode (no login). Not shared across devices.
 * Shape: { v: 1, goals?, days: { "YYYY-MM-DD": LoggedItem[] } }
 */
const KEY = "nutivo.local.v1";

interface Store {
  v: 1;
  /** Set once the sample week has been loaded, so it is not re-added after the user clears it. */
  seeded?: boolean;
  goals?: Goals;
  days: Record<string, LoggedItem[]>;
}

function read(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { v: 1, days: {} };
    const parsed = JSON.parse(raw) as Store;
    return parsed?.v === 1 && parsed.days ? parsed : { v: 1, days: {} };
  } catch {
    return { v: 1, days: {} };
  }
}

function write(s: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked (private mode): the session keeps working in memory.
  }
}

export function loadLocalDay(today: string) {
  const s = read();
  const pastLogDates = Object.keys(s.days).filter((d) => d < today && (s.days[d]?.length ?? 0) > 0).sort();
  return { items: s.days[today] ?? [], goals: s.goals, pastLogDates };
}

export function saveLocalDay(today: string, items: LoggedItem[]) {
  const s = read();
  s.days[today] = items;
  write(s);
}

export function saveLocalGoals(goals: Goals) {
  const s = read();
  s.goals = goals;
  write(s);
}

export function clearLocalDay(today: string) {
  const s = read();
  delete s.days[today];
  write(s);
}

/** Today's date in the browser's timezone. */
export function browserToday(): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Writes a sample week (goals, 8 past days with one gap, today). Replaces whatever was stored. */
export function seedLocalSample(today: string) {
  write({ v: 1, seeded: true, goals: SAMPLE_GOALS, days: { ...samplePastDays(today, addDays), [today]: sampleTodayItems() } });
}

export function isLocalSeeded(): boolean {
  return read().seeded === true;
}

/** Every stored day (for the day strip) plus goals. */
export function loadLocalAll(): { days: Record<string, LoggedItem[]>; goals?: Goals } {
  const s = read();
  return { days: s.days, goals: s.goals };
}
