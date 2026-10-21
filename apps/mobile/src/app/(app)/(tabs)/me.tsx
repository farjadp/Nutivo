import { toPersianDigits, type AppProfile } from "@nutivo/core";
import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { ChevronLeft, Globe, LogOut, MessageCircle, Phone, Send, Target, Trash2 } from "lucide-react-native";
import { useCallback, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, Text as RNText, Switch, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { api } from "@/lib/api";
import { faInt } from "@/lib/format";
import { useSession } from "@/lib/session";
import { Nuti } from "@/ui/nuti";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

const SUPPORT = {
  telegram: "https://t.me/farjadtalks",
  phone: "+14376611674",
  // LRI…PDI: Android's RTL layout otherwise reverses the groups («1674 661 437 1+»).
  phoneLabel: "\u2066+1 437 661 1674\u2069",
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

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      {title && <Text accessibilityRole="header" className="px-1 text-xs text-ink-2">{title}</Text>}
      <View className="overflow-hidden rounded-card border border-line bg-surface">{children}</View>
    </View>
  );
}

const Divider = () => <View className="ms-14 h-px bg-line" />;

function NutiRow() {
  const { me, setNuti } = useSession();
  const [green, track] = useCSSVariable(["--color-green-ink", "--color-track"]) as string[];
  const on = me?.nuti_enabled ?? true;
  const toggle = async (v: boolean) => {
    const err = await setNuti(v);
    if (err) Alert.alert("ذخیره نشد", err, [{ text: "باشه" }]);
  };
  // The whole row is the switch: a bigger target, and one stop for screen readers.
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="نوتی"
      accessibilityState={{ checked: on }}
      onPress={() => void toggle(!on)}
      className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-track"
    >
      <View className="size-6 items-center justify-center overflow-hidden">
        <Nuti mood={on ? "happy" : "sleepy"} size={28} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px]">نوتی</Text>
        <Text className="text-xs text-ink-2">{on ? "دستیار بامزه روشن است" : "حالت ساده: فقط اعداد و پیشنهاد"}</Text>
      </View>
      <Switch importantForAccessibility="no-hide-descendants" accessibilityElementsHidden value={on} onValueChange={(v) => void toggle(v)} trackColor={{ true: green, false: track }} />
    </Pressable>
  );
}

// LRI…PDI keeps «@name» in one piece inside Persian text (otherwise the @ lands at the far end).
const botName = (url: string | null) => (url ? `\u2066@${url.replace(/^https:\/\/t\.me\//, "").split("?")[0]}\u2069` : "Nutivo");

/** Not linked: a button that makes a one-time code and opens the bot with it. Linked: who it is linked to. */
function TelegramRow({ linkedAs }: { linkedAs: string | null }) {
  const green = useCSSVariable("--color-green-ink") as string;
  const [code, setCode] = useState<{ code: string; url: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link() {
    setBusy(true);
    setError(null);
    const r = await api.linkCode();
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setCode(r.data);
    if (r.data.url) void Linking.openURL(r.data.url);
  }

  return (
    <View className="gap-3 px-4 py-3">
      <View className="min-h-8 flex-row items-center gap-3">
        <View className="-scale-x-100"><Send color={green} size={20} /></View>
        <View className="flex-1">
          <Text className="text-[15px]">بات تلگرام</Text>
          <Text className="text-xs text-ink-2">{linkedAs != null ? `وصل است${linkedAs ? ` · ${linkedAs}` : ""}` : "ثبت وعده و گزارش شبانه در تلگرام"}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void link()}
          hitSlop={6}
          className="min-h-11 justify-center rounded-btn border border-green-ink px-3 active:bg-mint"
        >
          {busy ? <ActivityIndicator size="small" colorClassName="accent-green-ink" /> : <Text className="font-strong text-[13px] text-green-ink">{linkedAs != null ? "اتصال دوباره" : "اتصال"}</Text>}
        </Pressable>
      </View>
      {error && <Text accessibilityRole="alert" className="text-xs text-error">{error}</Text>}
      {code && (
        <View className="gap-2 rounded-btn bg-ground p-3">
          <Text className="text-xs leading-6 text-ink-2">
            اگر تلگرام باز نشد، این را در بات {botName(code.url)} بفرست (تا ۱۵ دقیقه معتبر است):
          </Text>
          {/* System font, not IRANYekanXFaNum: the code has Latin digits that must be typed as they are. LRM keeps the slash first. */}
          <RNText selectable className="rounded-[8px] bg-surface px-3 py-2 text-center text-lg font-semibold tracking-widest text-ink">
            {`\u200E/link ${code.code}`}
          </RNText>
          {code.url && (
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(code.url!)} className="min-h-11 items-center justify-center rounded-btn bg-green-ink active:opacity-80">
              <Text className="font-strong text-sm text-on-green">باز کردن بات و اتصال</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

/** «من»: account, profile and goals, نوتی, Telegram, support, sign-out and account deletion. */
export default function Me() {
  const { me, signOut } = useSession();
  const [green, error] = useCSSVariable(["--color-green-ink", "--color-error"]) as string[];
  const [profile, setProfile] = useState<AppProfile | null>(null);

  // Reload on every visit: goals change on the profile screen, the Telegram link changes in the bot.
  useFocusEffect(
    useCallback(() => {
      void api.profile().then((r) => r.ok && setProfile(r.data));
    }, []),
  );

  const goals = profile?.goals;
  const goalsLine = goals ? `${faInt(goals.kcal)} کالری · ${toPersianDigits(Math.round(goals.protein_g))} گرم پروتئین` : "قد، وزن، فعالیت و اهداف روزانه";

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
        <Row icon={<Target color={green} size={20} />} label="پروفایل و اهداف" detail={goalsLine} onPress={() => router.push("/profile")} />
      </Section>

      <Section title="تنظیمات">
        <NutiRow />
        <Divider />
        {profile ? <TelegramRow linkedAs={profile.telegram} /> : <View className="min-h-14" />}
      </Section>

      <Section title="پشتیبانی">
        <Row icon={<MessageCircle color={green} size={20} />} label="تلگرام" detail="@farjadtalks" onPress={() => Linking.openURL(SUPPORT.telegram)} />
        <Divider />
        <Row icon={<Phone color={green} size={20} />} label="تلفن و واتس‌اپ" detail={SUPPORT.phoneLabel} onPress={() => Linking.openURL(`tel:${SUPPORT.phone}`)} />
        <Divider />
        <Row icon={<Globe color={green} size={20} />} label="وب‌سایت" detail="farjadp.com" onPress={() => Linking.openURL(SUPPORT.site)} />
      </Section>

      <Section>
        <Row icon={<LogOut color={error} size={20} />} label="خروج از حساب" onPress={confirmSignOut} danger />
        <Divider />
        <Row icon={<Trash2 color={error} size={20} />} label="حذف حساب" onPress={() => router.push("/delete-account")} danger />
      </Section>

      <Text className="pb-6 text-center text-xs text-ink-2">Nutivo · نسخه {Constants.expoConfig?.version ?? "—"}</Text>
    </Screen>
  );
}
