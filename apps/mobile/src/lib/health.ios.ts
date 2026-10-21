import {
  getMostRecentQuantitySample,
  isHealthDataAvailableAsync,
  queryStatisticsForQuantity,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";
import { Linking } from "react-native";
import type { TodayActivity, WeightReading } from "./health";

export type { TodayActivity, WeightReading } from "./health";
export const HEALTH_NAME = "Apple Health";

const READ = ["HKQuantityTypeIdentifierBodyMass", "HKQuantityTypeIdentifierStepCount", "HKQuantityTypeIdentifierActiveEnergyBurned"] as const;

export async function healthAvailable(): Promise<boolean> {
  return isHealthDataAvailableAsync();
}

/** HealthKit never says whether read access was granted (privacy); a declined type just reads as empty. */
export async function connectHealth(): Promise<boolean> {
  if (!(await healthAvailable())) return false;
  return requestAuthorization({ toRead: READ });
}

const startOfToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export async function readTodayActivity(): Promise<TodayActivity> {
  const date = { startDate: startOfToday(), endDate: new Date() };
  const [steps, energy] = await Promise.all([
    queryStatisticsForQuantity("HKQuantityTypeIdentifierStepCount", ["cumulativeSum"], { filter: { date }, unit: "count" }).catch(() => null),
    queryStatisticsForQuantity("HKQuantityTypeIdentifierActiveEnergyBurned", ["cumulativeSum"], { filter: { date }, unit: "kcal" }).catch(() => null),
  ]);
  return {
    steps: steps?.sumQuantity ? Math.round(steps.sumQuantity.quantity) : null,
    activeKcal: energy?.sumQuantity ? Math.round(energy.sumQuantity.quantity) : null,
  };
}

export async function readLatestWeight(): Promise<WeightReading | null> {
  const s = await getMostRecentQuantitySample("HKQuantityTypeIdentifierBodyMass", "kg").catch(() => undefined);
  return s ? { kg: Math.round(s.quantity * 10) / 10, at: new Date(s.endDate).toISOString() } : null;
}

/** iOS has no deep link to one app's Health permissions; the Health app is the closest. */
export function openHealthSettings(): void {
  void Linking.openURL("x-apple-health://").catch(() => Linking.openSettings());
}
