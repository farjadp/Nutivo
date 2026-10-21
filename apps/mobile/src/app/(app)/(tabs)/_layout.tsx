import { router, Tabs } from "expo-router";
import { FileText, House, Plus, UserRound } from "lucide-react-native";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";

/**
 * امروز · گزارش · ثبت · من. With forced RTL the first tab sits on the right.
 * «ثبت» is not a screen: pressing it opens the log sheet over whatever tab is showing.
 * Android back from any tab returns to امروز first, then leaves the app.
 */
export default function TabsLayout() {
  const [green, ink2, surface, line, onGreen] = useCSSVariable(["--color-green-ink", "--color-ink-2", "--color-surface", "--color-line", "--color-on-green"]) as string[];
  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: green,
        tabBarInactiveTintColor: ink2,
        tabBarStyle: { backgroundColor: surface, borderTopColor: line },
        tabBarLabelStyle: { fontFamily: "IRANYekanXFaNum-Bold", fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "امروز", tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={1.75} /> }} />
      <Tabs.Screen name="report" options={{ title: "گزارش", tabBarIcon: ({ color, size }) => <FileText color={color} size={size} strokeWidth={1.75} /> }} />
      <Tabs.Screen
        name="add"
        options={{
          title: "ثبت",
          tabBarAccessibilityLabel: "ثبت وعده",
          tabBarIcon: () => (
            <View className="size-7 items-center justify-center rounded-full bg-green-ink">
              <Plus color={onGreen} size={18} strokeWidth={2.5} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/log");
          },
        }}
      />
      <Tabs.Screen name="me" options={{ title: "من", tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} strokeWidth={1.75} /> }} />
    </Tabs>
  );
}
