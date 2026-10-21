import { Pressable, View } from "react-native";
import { ProfileForm } from "@/features/profile/profile-form";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

export default function Onboarding() {
  const { refreshMe, signOut, me } = useSession();

  return (
    <Screen>
      <View className="mt-4 gap-2">
        <Text accessibilityRole="header" className="font-heavy text-[24px] leading-[38px]">چند تا عدد، برای شروع</Text>
        <Text className="text-[15px] leading-7 text-ink-2">
          از این‌ها هدف روزانه‌ات را حساب می‌کنیم. فقط برای حساب انرژی پایه است و به کسی نشان داده نمی‌شود. بعداً از «من › پروفایل و اهداف» عوضش می‌کنی.
        </Text>
      </View>

      {/* Nothing pre-filled: pressing «شروع» without reading must not save made-up goals. */}
      <ProfileForm
        submitLabel="شروع"
        onSubmit={async (p) => {
          const r = await api.onboard(p);
          if (!r.ok) return r.error;
          await refreshMe();
          return null;
        }}
      />

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
