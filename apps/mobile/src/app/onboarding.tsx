import { Pressable, View } from "react-native";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

export default function Onboarding() {
  const { refreshMe, signOut, me } = useSession();

  return (
    <Screen>
      <View className="mt-2">
        <OnboardingWizard
          onSubmit={async (p) => {
            const r = await api.onboard(p);
            if (!r.ok) return r.error;
            await refreshMe();
            return null;
          }}
        />
      </View>

      {/* A way out for someone who signed in with the wrong email. */}
      <View className="items-center gap-1 pb-4">
        {me?.email && <Text className="text-xs text-ink-2">وارد شده با {me.email}</Text>}
        <Pressable accessibilityRole="button" onPress={() => void signOut()} className="min-h-11 justify-center px-3 active:opacity-70">
          <Text className="text-sm text-green-ink">با ایمیل دیگری وارد شو</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
