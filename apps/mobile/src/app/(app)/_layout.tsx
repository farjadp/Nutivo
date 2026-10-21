import { Stack } from "expo-router";

// A deep link straight to /log or /item still has the tabs underneath, so closing it lands somewhere.
export const unstable_settings = { initialRouteName: "(tabs)" };

/** Signed-in app: the tab bar, plus the two sheets that change data (log a meal, edit an item). */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="log" options={{ presentation: "modal" }} />
      <Stack.Screen name="item/[id]" options={{ presentation: "modal" }} />
    </Stack>
  );
}
