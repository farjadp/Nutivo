import { toPersianDigits, type AppProfile } from "@nutivo/core";
import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { ChevronLeft, Globe, KeyRound, LogOut, MessageCircle, Phone, Send, Target, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, Text as RNText, Switch, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { HealthRow, WeightSuggestion } from "@/features/health/health-rows";
import { ReminderRows } from "@/features/reminders/reminder-rows";
import { api } from "@/lib/api";
import { faInt } from "@/lib/format";
import { useSession } from "@/lib/session";
import { Nakhonak } from "@/ui/nakhonak";
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

/** «حالت شیطان»: opens «پرونده‌ی ناخنک», where the switch and the rules live. */
function NakhonakRow() {
  const { me } = useSession();
  const ink2 = useCSSVariable("--color-ink-2") as string;
  const on = me?.nakhonak_enabled ?? false;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push("/nakhonak")} className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-track">
      <View className="size-6 items-center justify-center overflow-hidden">
        <Nakhonak mood={on ? "sly" : "gentle"} size={30} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px]">حالت شیطان</Text>
        <Text className="text-xs text-ink-2">{on ? "ناخنک روشن است · پرونده و امتیاز" : "ناخنک، رقیب قصه‌گو. خاموش"}</Text>
      </View>
      <ChevronLeft color={ink2} size={18} />
    </Pressable>
  );
}

// LRI…PDI keeps «@name» in one piece inside Persian text (otherwise the @ lands at the far end).
const botName = (url: string | null) => (url ? `\u2066@${url.replace(/^https:\/\/t\.me\//, "").split("?")[0]}\u2069` : "Nutivo");

/** Telegram app link first (opens the app, no browser hop), the t.me page as a fallback. */
async function openBot(url: string) {
  const m = url.match(/^https:\/\/t\.me\/([^?]+)\?start=(.+)$/);
  const app = m ? `tg://resolve?domain=${m[1]}&start=${m[2]}` : null;
  if (app && (await Linking.openURL(app).then(() => true, () => false))) return;
  await Linking.openURL(url);
}

/**
 * One tap: a one-time code is made and Telegram opens on the bot with it; the user only presses
 * «Start» there. The row then watches for the link and turns into «وصل است» by itself.
 */
function TelegramRow({ linkedAs, onLinked }: { linkedAs: string | null; onLinked: () => void }) {
  const green = useCSSVariable("--color-green-ink") as string;
  const [code, setCode] = useState<{ code: string; url: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linked = linkedAs != null;

  // While a code is out, check every few seconds whether the bot has linked the account (15 minutes at most).
  useEffect(() => {
    if (!code || linked) return;
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > 15 * 60_000) return clearInterval(t);
      onLinked();
    }, 3000);
    return () => clearInterval(t);
  }, [code, linked, onLinked]);
  useEffect(() => {
    if (linked) setCode(null);
  }, [linked]);

  async function link() {
    setBusy(true);
    setError(null);
    const r = await api.linkCode();
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setCode(r.data);
    if (r.data.url) await openBot(r.data.url).catch(() => undefined);
  }

  return (
    <View className="gap-3 px-4 py-3">
      <View className="min-h-8 flex-row items-center gap-3">
        <View className="-scale-x-100"><Send color={green} size={20} /></View>
        <View className="flex-1">
          <Text className="text-[15px]">بات تلگرام</Text>
          <Text className={`text-xs ${linked ? "text-green-ink" : "text-ink-2"}`}>
            {linked ? `وصل است${linkedAs ? ` · ${linkedAs}` : ""}` : code ? "در تلگرام دکمه Start را بزن…" : "ثبت وعده و گزارش شبانه در تلگرام"}
          </Text>
        </View>
        {!code && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={linked ? "اتصال دوباره به بات تلگرام" : "اتصال به بات تلگرام"}
            disabled={busy}
            onPress={() => void link()}
            hitSlop={6}
            className={`min-h-11 justify-center rounded-btn px-3 active:opacity-80 ${linked ? "border border-line" : "bg-green-ink"}`}
          >
            {busy ? (
              <ActivityIndicator size="small" colorClassName={linked ? "accent-green-ink" : "accent-on-green"} />
            ) : (
              <Text className={`font-strong text-[13px] ${linked ? "text-ink-2" : "text-on-green"}`}>{linked ? "اتصال دوباره" : "اتصال با یک ضربه"}</Text>
            )}
          </Pressable>
        )}
        {code && <ActivityIndicator size="small" colorClassName="accent-green-ink" accessibilityLabel="منتظر اتصال" />}
      </View>
      {error && <Text accessibilityRole="alert" className="text-xs text-error">{error}</Text>}
      {code && (
        <View className="gap-2 rounded-btn bg-ground p-3">
          <Text className="text-xs leading-6 text-ink-2">
            تلگرام باز نشد؟ دوباره امتحان کن، یا این را در بات {botName(code.url)} بفرست (تا ۱۵ دقیقه معتبر است):
          </Text>
          {/* System font, not IRANYekanXFaNum: the code has Latin digits that must be typed as they are. LRM keeps the slash first. */}
          <RNText selectable className="rounded-[8px] bg-surface px-3 py-2 text-center text-lg font-semibold tracking-widest text-ink">
            {`\u200E/link ${code.code}`}
          </RNText>
          <View className="flex-row gap-2">
            {code.url && (
              <Pressable accessibilityRole="link" onPress={() => void openBot(code.url!)} className="min-h-11 flex-1 items-center justify-center rounded-btn border border-green-ink active:bg-mint">
                <Text className="font-strong text-sm text-green-ink">باز کردن دوباره تلگرام</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" onPress={() => setCode(null)} className="min-h-11 justify-center rounded-btn px-3 active:bg-track">
              <Text className="text-sm text-ink-2">بعداً</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

/** «من»: account, profile and goals, نوتی, Telegram, support, sign-out and account deletion. */
export default function Me() {
  const { me, signOut, session } = useSession();
  const hasPassword = session?.user.user_metadata?.has_password === true;
  const [green, error] = useCSSVariable(["--color-green-ink", "--color-error"]) as string[];
  const [profile, setProfile] = useState<AppProfile | null>(null);

  // Reload on every visit: goals change on the profile screen, the Telegram link changes in the bot.
  const loadProfile = useCallback(() => {
    void api.profile().then((r) => r.ok && setProfile(r.data));
  }, []);
  useFocusEffect(loadProfile);

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

      <WeightSuggestion profile={profile} onUpdated={loadProfile} />

      <Section title="حساب">
        <View className="px-4 py-3">
          <Text className="text-xs text-ink-2">ایمیل</Text>
          <Text className="text-[15px] text-left">{me?.email ?? "—"}</Text>
        </View>
        <Divider />
        <Row icon={<Target color={green} size={20} />} label="پروفایل و اهداف" detail={goalsLine} onPress={() => router.push("/profile")} />
        <Divider />
        <Row
          icon={<KeyRound color={green} size={20} />}
          label={hasPassword ? "عوض کردن رمز" : "گذاشتن رمز (اختیاری)"}
          detail={hasPassword ? "ورود با ایمیل و رمز فعال است" : "برای ورود بدون منتظر ماندن برای کد"}
          onPress={() => router.push("/password")}
        />
      </Section>

      <Section title="تنظیمات">
        <NutiRow />
        <Divider />
        <NakhonakRow />
        <Divider />
        {profile ? <TelegramRow linkedAs={profile.telegram} onLinked={loadProfile} /> : <View className="min-h-14" />}
      </Section>

      <Section title="سلامت">
        <HealthRow />
      </Section>

      <Section title="یادآوری‌ها">
        <ReminderRows />
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
