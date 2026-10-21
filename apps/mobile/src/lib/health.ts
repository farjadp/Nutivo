/**
 * Read-only bridge to the phone's health store: Apple Health on iOS (health.ios.ts),
 * Health Connect on Android (health.android.ts). Nutivo only reads weight, steps and active
 * energy, and only after the user switches it on in «من». Nothing is written back.
 *
 * This file is the fallback for platforms without a health store, and the shared types.
 */

export interface TodayActivity {
  steps: number | null;
  activeKcal: number | null;
}

export interface WeightReading {
  kg: number;
  /** When the weight was measured (ISO). */
  at: string;
}

/** "Apple Health" or "Health Connect", for copy. */
export const HEALTH_NAME = "Health";

export async function healthAvailable(): Promise<boolean> {
  return false;
}

/** Shows the system consent sheet. Returns false when the store is missing or the user declined. */
export async function connectHealth(): Promise<boolean> {
  return false;
}

export async function readTodayActivity(): Promise<TodayActivity> {
  return { steps: null, activeKcal: null };
}

export async function readLatestWeight(): Promise<WeightReading | null> {
  return null;
}

/** Where the user can review or withdraw access. */
export function openHealthSettings(): void {}
