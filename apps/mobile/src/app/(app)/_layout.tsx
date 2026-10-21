import { Stack } from "expo-router";
import { useReduceMotion } from "@/lib/motion";
import { HealthProvider } from "@/lib/health-provider";
import { RemindersProvider } from "@/lib/reminders-provider";

// A deep link straight to /log or /item still has the tabs underneath, so closing it lands somewhere.
export const unstable_settings = { initialRouteName: "(tabs)" };

/** Signed-in app: the tab bar, the two sheets that change data (log a meal, edit an item), and pages opened from «من». */
export default function AppLayout() {
  // Reduce Motion: pages appear without sliding (sheets keep the system presentation).
  const reduceMotion = useReduceMotion();
  return (
    <RemindersProvider>
      <HealthProvider>
        <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? "none" : "default" }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="log" options={{ presentation: "modal" }} />
          <Stack.Screen name="item/[id]" options={{ presentation: "modal" }} />
          <Stack.Screen name="profile" />
          <Stack.Screen name="delete-account" />
          <Stack.Screen name="password" />
          <Stack.Screen name="nakhonak" />
        </Stack>
      </HealthProvider>
    </RemindersProvider>
  );
}
