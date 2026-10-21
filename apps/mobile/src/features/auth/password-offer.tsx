import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { KeyRound, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { useSession } from "@/lib/session";
import { Text } from "@/ui/text";

const key = (userId: string) => `nutivo.password-offer.dismissed.${userId}`;

/** After a code sign-in, once: offer a password for next time. Gone for good after «بعداً» or once a password is set. */
export function PasswordOffer() {
  const { session } = useSession();
  const [green, ink2] = useCSSVariable(["--color-green-ink", "--color-ink-2"]) as string[];
  const [dismissed, setDismissed] = useState(true);
  const user = session?.user;
  const hasPassword = user?.user_metadata?.has_password === true;

  useEffect(() => {
    if (!user || hasPassword) return;
    void AsyncStorage.getItem(key(user.id)).then((v) => setDismissed(v === "1"));
  }, [user, hasPassword]);

  if (!user || hasPassword || dismissed) return null;
  const hide = () => {
    setDismissed(true);
    void AsyncStorage.setItem(key(user.id), "1");
  };

  return (
    <View className="flex-row items-center gap-1 rounded-card border border-line bg-surface ps-4">
      {/* The whole card opens the password screen; × is a separate target. */}
      <Pressable accessibilityRole="button" accessibilityHint="رمز بگذار" onPress={() => router.push("/password")} className="min-h-16 flex-1 flex-row items-center gap-3 py-3 active:opacity-70">
      <KeyRound color={green} size={22} />
      <View className="flex-1 gap-0.5">
        <Text className="font-strong text-[15px]">دفعه بعد بدون کد وارد شو</Text>
        <Text className="text-xs leading-5 text-ink-2">یک رمز بگذار؛ اختیاری است و ورود با کد هم می‌ماند.</Text>
      </View>
      <View className="min-h-11 justify-center rounded-btn bg-green-ink px-3">
        <Text className="font-strong text-[13px] text-on-green">رمز بگذار</Text>
      </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="بعداً" onPress={hide} className="size-11 items-center justify-center rounded-full active:bg-track">
        <X color={ink2} size={18} />
      </Pressable>
    </View>
  );
}
