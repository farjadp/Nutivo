import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from "react-native-health-connect";
import type { TodayActivity, WeightReading } from "./health";

export type { TodayActivity, WeightReading } from "./health";
export const HEALTH_NAME = "Health Connect";

const READ = [
  { accessType: "read", recordType: "Weight" },
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "ActiveCaloriesBurned" },
] as const;

let ready: Promise<boolean> | null = null;
/** Built into Android 14+; older phones need the Health Connect app. Initialized once per launch. */
function init(): Promise<boolean> {
  ready ??= (async () => (await getSdkStatus()) === SdkAvailabilityStatus.SDK_AVAILABLE && (await initialize()))().catch(() => false);
  return ready;
}

export async function healthAvailable(): Promise<boolean> {
  return init();
}

export async function connectHealth(): Promise<boolean> {
  if (!(await init())) return false;
  const granted = await requestPermission([...READ]);
  return granted.length > 0;
}

async function has(recordType: (typeof READ)[number]["recordType"]): Promise<boolean> {
  const granted = await getGrantedPermissions();
  return granted.some((p) => p.recordType === recordType && p.accessType === "read");
}

const today = () => {
  const now = new Date();
  return { operator: "between" as const, startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(), endTime: now.toISOString() };
};

export async function readTodayActivity(): Promise<TodayActivity> {
  if (!(await init())) return { steps: null, activeKcal: null };
  const [steps, energy] = await Promise.all([
    has("Steps").then((ok) => (ok ? aggregateRecord({ recordType: "Steps", timeRangeFilter: today() }) : null)).catch(() => null),
    has("ActiveCaloriesBurned").then((ok) => (ok ? aggregateRecord({ recordType: "ActiveCaloriesBurned", timeRangeFilter: today() }) : null)).catch(() => null),
  ]);
  return {
    steps: steps ? Math.round(steps.COUNT_TOTAL) : null,
    activeKcal: energy ? Math.round(energy.ACTIVE_CALORIES_TOTAL.inKilocalories) : null,
  };
}

export async function readLatestWeight(): Promise<WeightReading | null> {
  if (!(await init()) || !(await has("Weight").catch(() => false))) return null;
  // The last 90 days is plenty; newest first.
  const end = new Date();
  const start = new Date(end.getTime() - 90 * 86400000);
  const r = await readRecords("Weight", {
    timeRangeFilter: { operator: "between", startTime: start.toISOString(), endTime: end.toISOString() },
    ascendingOrder: false,
    pageSize: 1,
  }).catch(() => null);
  const w = r?.records[0];
  return w ? { kg: Math.round(w.weight.inKilograms * 10) / 10, at: w.time } : null;
}

export function openHealthSettings(): void {
  openHealthConnectSettings();
}
