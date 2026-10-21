import Constants from "expo-constants";
import { ChevronLeft, Globe, LogOut, MessageCircle, Phone } from "lucide-react-native";
import type { ReactNode } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { useSession } from "@/lib/session";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

const SUPPORT = {
  telegram: "https://t.me/farjadtalks",
  phone: "+14376611674",
  phoneLabel: "+1 437 661 1674",
  site: "https://www.farjadp.com",
};

function Row({ icon, label, detail, onPress, danger = false }: { icon: ReactNode; label: string; detail?: string; onPress: () => void; danger?: boolean }) {
  const ink2 = useCSSVariable("--color-ink-2") as string;
  return (
    <Pressable accessibilityRole="button" accessibilityHint={detail} onPress={onPress} className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-track">
      {icon}
      <View className="flex-1">
        <Text className={`text-[15px] ${danger ? "text-error" : ""}`}>{label}</Text>
        {detail && <Text className="text-xs text-ink-2">{detail}</Text>}
      </View>
      {/* Points to the reading direction's end: left in RTL. */}
      {!danger && <ChevronLeft color={ink2} size={18} />}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="px-1 text-xs text-ink-2">{title}</Text>
      <View className="overflow-hidden rounded-card border border-line bg-surface">{children}</View>
    </View>
  );
}

const Divider = () => <View className="ms-14 h-px bg-line" />;

/** «من»: account and help. Profile, goals, نوتی and the Telegram link join this screen next (card UX ۲). */
export default function Me() {
  const { me, signOut } = useSession();
  const [green, error] = useCSSVariable(["--color-green-ink", "--color-error"]) as string[];

  function confirmSignOut() {
    Alert.alert("خروج از حساب؟", "برای ورود دوباره یک کد به ایمیلت می‌آید.", [
      { text: "انصراف", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <Screen>
      <Text accessibilityRole="header" className="font-heavy mt-2 text-[24px] leading-[38px]">من</Text>

      <Section title="حساب">
        <View className="px-4 py-3">
          <Text className="text-xs text-ink-2">ایمیل</Text>
          <Text className="text-[15px] text-left">{me?.email ?? "—"}</Text>
        </View>
        <Divider />
        <Row icon={<LogOut color={error} size={20} />} label="خروج از حساب" onPress={confirmSignOut} danger />
      </Section>

      <Section title="پشتیبانی">
        <Row icon={<MessageCircle color={green} size={20} />} label="تلگرام" detail="@farjadtalks" onPress={() => Linking.openURL(SUPPORT.telegram)} />
        <Divider />
        <Row icon={<Phone color={green} size={20} />} label="تلفن و واتس‌اپ" detail={SUPPORT.phoneLabel} onPress={() => Linking.openURL(`tel:${SUPPORT.phone}`)} />
        <Divider />
        <Row icon={<Globe color={green} size={20} />} label="وب‌سایت" detail="farjadp.com" onPress={() => Linking.openURL(SUPPORT.site)} />
      </Section>

      <Text className="pb-6 text-center text-xs text-ink-2">Nutivo · نسخه {Constants.expoConfig?.version ?? "—"}</Text>
    </Screen>
  );
}
