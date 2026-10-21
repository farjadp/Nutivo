import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { connectHealth, healthAvailable, readLatestWeight, readTodayActivity, type TodayActivity, type WeightReading } from "./health";

const KEY = "nutivo.health.v1";

interface Stored {
  on: boolean;
  /** `at` of a Health weight the user chose not to copy into the profile; not offered again. */
  dismissedWeightAt?: string;
}

interface HealthState {
  available: boolean;
  on: boolean;
  activity: TodayActivity | null;
  weight: WeightReading | null;
  dismissedWeightAt: string | null;
  /** Shows the system consent sheet on the way on. Returns false if the store is missing or declined. */
  setOn: (on: boolean) => Promise<boolean>;
  dismissWeight: (at: string) => void;
  refresh: () => void;
}

const Ctx = createContext<HealthState | null>(null);

/** Read-only health data, only while the user has it switched on (explicit consent, per device). */
export function HealthProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState(false);
  const [stored, setStored] = useState<Stored>({ on: false });
  const [activity, setActivity] = useState<TodayActivity | null>(null);
  const [weight, setWeight] = useState<WeightReading | null>(null);

  const save = useCallback((s: Stored) => {
    setStored(s);
    void AsyncStorage.setItem(KEY, JSON.stringify(s));
  }, []);

  const read = useCallback(async (on: boolean) => {
    if (!on) {
      setActivity(null);
      setWeight(null);
      return;
    }
    const [a, w] = await Promise.all([readTodayActivity().catch(() => null), readLatestWeight().catch(() => null)]);
    setActivity(a);
    setWeight(w);
  }, []);

  useEffect(() => {
    void (async () => {
      setAvailable(await healthAvailable().catch(() => false));
      const raw = await AsyncStorage.getItem(KEY).catch(() => null);
      const s: Stored = raw ? (JSON.parse(raw) as Stored) : { on: false };
      setStored(s);
      void read(s.on);
    })();
  }, [read]);

  // Steps keep counting while the app is closed; read again when it comes back.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => st === "active" && void read(stored.on));
    return () => sub.remove();
  }, [read, stored.on]);

  const setOn = useCallback<HealthState["setOn"]>(
    async (on) => {
      if (on && !(await connectHealth().catch(() => false))) return false;
      save({ ...stored, on });
      await read(on);
      return true;
    },
    [read, save, stored],
  );

  return (
    <Ctx.Provider
      value={{
        available,
        on: stored.on,
        activity,
        weight,
        dismissedWeightAt: stored.dismissedWeightAt ?? null,
        setOn,
        dismissWeight: (at) => save({ ...stored, dismissedWeightAt: at }),
        refresh: () => void read(stored.on),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useHealth(): HealthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useHealth outside HealthProvider");
  return v;
}
