import "../global.css";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "@/lib/session";
import { UndoProvider } from "@/lib/undo";
import { Button } from "@/ui/button";
import { Logo } from "@/ui/logo";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

SplashScreen.preventAutoHideAsync();

/** Signed in but the account could not be loaded (server down, no network): retry instead of guessing «no goals». */
function AccountError() {
  const { error, refreshMe, signOut } = useSession();
  const [busy, setBusy] = useState(false);
  return (
    <Screen>
      <View className="mt-16 gap-4">
        <Logo height={32} />
        <Text className="font-strong text-lg">به سرور Nutivo وصل نشدیم</Text>
        <Text className="text-[15px] leading-7 text-ink-2">{error ?? "اینترنت را چک کن و دوباره امتحان کن."}</Text>
        <Button
          label="دوباره"
          busyLabel="در حال اتصال…"
          busy={busy}
          onPress={async () => {
            setBusy(true);
            await refreshMe();
            setBusy(false);
          }}
        />
        <Button variant="quiet" label="خروج از حساب" onPress={signOut} />
      </View>
    </Screen>
  );
}

/** Signed in, account still loading: show it is working instead of a blank screen. */
function Opening() {
  return (
    <View accessibilityLiveRegion="polite" className="flex-1 items-center justify-center gap-4 bg-ground">
      <Logo height={40} />
      <ActivityIndicator colorClassName="accent-green-ink" />
      <Text className="text-sm text-ink-2">در حال باز کردن حسابت…</Text>
    </View>
  );
}

function Routes() {
  const { ready, session, me, loadingMe } = useSession();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  const signedIn = Boolean(session);
  if (signedIn && !me) return loadingMe ? <Opening /> : <AccountError />;
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !me?.has_goals}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && Boolean(me?.has_goals)}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <UndoProvider>
          <StatusBar style="auto" />
          <Routes />
        </UndoProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
