import type { AppProfile } from "@nutivo/core";
import { router, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { ProfileForm } from "@/features/profile/profile-form";
import { api } from "@/lib/api";
import { useUndo } from "@/lib/undo";
import { BackHeader } from "@/ui/back-header";
import { Button } from "@/ui/button";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

/** «پروفایل و اهداف»: the onboarding form, filled with the current numbers. Saving recomputes the goals. */
export default function ProfileScreen() {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    setError(null);
    void api.profile().then((r) => (r.ok ? setProfile(r.data) : setError(r.error)));
  };
  useEffect(load, []);

  return (
    <Screen>
      <BackHeader title="پروفایل و اهداف" />
      {profile ? (
        <Editor profile={profile} />
      ) : error ? (
        <View className="gap-3">
          <Text accessibilityRole="alert" className="text-[15px] text-ink-2">{error}</Text>
          <Button variant="quiet" label="دوباره امتحان کن" onPress={load} />
        </View>
      ) : (
        <View className="items-center py-12">
          <ActivityIndicator colorClassName="accent-green-ink" />
        </View>
      )}
    </Screen>
  );
}

function Editor({ profile }: { profile: AppProfile }) {
  const navigation = useNavigation();
  const { refresh } = useUndo();
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  usePreventRemove(dirty && !saved, ({ data }) => {
    Alert.alert("تغییرها ذخیره نشده", "اگر الان بروی، عددهای قبلی می‌مانند.", [
      { text: "ادامه ویرایش", style: "cancel" },
      { text: "بی‌خیال", style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  // Leave only after the guard has seen `saved`, so it doesn't ask about changes that were just stored.
  useEffect(() => {
    if (saved) router.back();
  }, [saved]);

  return (
    <ProfileForm
      initial={profile}
      submitLabel="ذخیره"
      onDirtyChange={setDirty}
      onSubmit={async (p) => {
        const r = await api.onboard(p);
        if (!r.ok) return r.error;
        refresh();
        setSaved(true);
        return null;
      }}
    />
  );
}
