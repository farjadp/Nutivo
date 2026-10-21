import type { AppDay, NutiMood, ReportView } from "@nutivo/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useCSSVariable } from "uniwind";
import { DayStrip } from "@/features/day/day-strip";
import { api } from "@/lib/api";
import { faDayLabel, faInt } from "@/lib/format";
import { mealLabel } from "@/lib/meals";
import { useSession } from "@/lib/session";
import { useUndo } from "@/lib/undo";
import { Button } from "@/ui/button";
import { Nuti, NutiSays } from "@/ui/nuti";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

const cleanName = (n: string) => n.replace(/\s*\(.*?\)/g, "");

function Card({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <View className="gap-3 rounded-card border border-line bg-surface p-4">
      <View className="flex-row items-center gap-2">
        <View className="size-6 items-center justify-center rounded-full bg-mint">
          <Text className="font-heavy text-[12px] text-green-ink">{n}</Text>
        </View>
        <Text className="font-strong text-base">{title}</Text>
      </View>
      {children}
    </View>
  );
}

/** Consumed against the ±10% band. Over is the soft amber, never red. */
function KcalBand({ f }: { f: ReportView["facts"]["kcal"] }) {
  const [green, track, band, over] = useCSSVariable(["--color-green", "--color-track", "--color-mint", "--color-fat"]) as string[];
  const max = Math.max(f.high * 1.15, f.consumed);
  const x = (v: number) => (v / max) * 100;
  return (
    // RTL: drawn left to right, then mirrored so progress grows from the right.
    <Svg width="100%" height={12} viewBox="0 0 100 10" preserveAspectRatio="none" transform={[{ scaleX: -1 }]}>
      <Rect x={0} y={0} width={100} height={10} rx={5} fill={track} />
      <Rect x={x(f.low)} y={0} width={x(f.high) - x(f.low)} height={10} fill={band} />
      <Rect x={0} y={2} width={x(f.consumed)} height={6} rx={3} fill={f.status === "over" ? over : green} />
    </Svg>
  );
}

function MacroLine({ label, fact, ok, ink }: { label: string; fact: { consumed: number; goal: number; diff: number }; ok: boolean; ink: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[15px]">{label}</Text>
      <Text className="text-sm text-ink-2">
        <Text className={`font-strong text-sm ${ink}`}>{faInt(fact.consumed)}</Text> از {faInt(fact.goal)} گرم
        {/* Words, not ±: a minus sign lands on the wrong side of the number in RTL text. */}
        {ok ? " · خوب" : ` · ${faInt(Math.abs(fact.diff))} ${fact.diff >= 0 ? "بیشتر" : "کمتر"}`}
      </Text>
    </View>
  );
}

const MOOD: Record<ReportView["facts"]["kcal"]["status"], NutiMood> = { in_range: "cheer", under: "think", over: "happy" };

export default function Report() {
  // A day picked on «امروز» arrives as ?date=; the strip here can change it.
  const params = useLocalSearchParams<{ date?: string }>();
  const [date, setDate] = useState<string | undefined>(params.date);
  const nutiOn = useSession().me?.nuti_enabled ?? true;
  const purple = useCSSVariable("--color-purple-ink") as string;
  useEffect(() => setDate(params.date), [params.date]);
  const { version } = useUndo();
  const [strip, setStrip] = useState<AppDay["strip"] | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [r, setR] = useState<ReportView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    const [res, day] = await Promise.all([api.report(date), api.day(date)]);
    if (day.ok) {
      setStrip(day.data.strip);
      setToday(day.data.day.today);
    }
    setLoading(false);
    if (res.ok) setR(res.data);
    else setError(res.error);
  }
  useEffect(() => {
    void load(); // per day, and again after a meal is saved or edited
  }, [date, version]);

  const f = r?.facts;
  return (
    <Screen>
      <View className="mt-2">
        {/* «امروز» / «دیروز» get the date underneath; older days show the date in the title. */}
        <Text accessibilityRole="header" className="font-heavy text-[24px] leading-[38px]">
          گزارش {r ? (["امروز", "دیروز"].includes(r.day_label) ? r.day_label : faDayLabel(r.date)) : ""}
        </Text>
        {r && ["امروز", "دیروز"].includes(r.day_label) && <Text className="text-xs text-ink-2">{faDayLabel(r.date)}</Text>}
      </View>

      {strip && today && r && <DayStrip strip={strip} today={today} selected={r.date} onSelect={(d) => setDate(d)} />}

      {loading && (
        <View accessibilityLiveRegion="polite" className="items-center gap-3 rounded-card bg-purple-tint p-6">
          {nutiOn ? <Nuti mood="chew" size={72} /> : <ActivityIndicator colorClassName="accent-purple-ink" />}
          <Text className="text-[15px] text-purple-ink">{nutiOn ? "دارم گزارشت رو می‌نویسم…" : "در حال نوشتن گزارش…"}</Text>
        </View>
      )}

      {error && (
        <View className="gap-3">
          <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>
          <Button variant="quiet" label="دوباره" onPress={load} />
        </View>
      )}

      {r && f && !loading && !f.logged && (
        <View className="gap-4">
          {nutiOn ? (
            <NutiSays mood="sleepy" text="برای این روز چیزی ثبت نشده. هر وقت چیزی بخوری و ثبت کنی، گزارشش اینجاست." />
          ) : (
            <Text className="text-[15px] leading-7 text-ink-2">برای این روز چیزی ثبت نشده. وقتی وعده‌ای ثبت کنی، گزارشش اینجا می‌آید.</Text>
          )}
          <Button label="ثبت وعده" onPress={() => router.push(r.date === today ? "/log" : { pathname: "/log", params: { date: r.date } })} />
        </View>
      )}

      {r && f && !loading && f.logged && (
        <View className="gap-4">
          <Card n="۱" title="کالری">
            <View className="flex-row items-end justify-between">
              <Text className="font-heavy text-[32px] leading-[42px]">
                {f.is_partial ? "≈" : ""}{faInt(f.kcal.consumed)}
                <Text className="text-sm text-ink-2"> از {faInt(f.kcal.goal)}</Text>
              </Text>
              <View className={`rounded-full px-2.5 py-1 ${f.kcal.status === "in_range" ? "bg-mint" : f.kcal.status === "over" ? "bg-fat/15" : "bg-track"}`}>
                <Text className={`font-strong text-[13px] ${f.kcal.status === "in_range" ? "text-green-ink" : f.kcal.status === "over" ? "text-fat-ink" : "text-ink-2"}`}>
                  {f.kcal.status === "in_range" ? "در محدوده" : f.kcal.status === "under" ? "زیر محدوده" : "بالای محدوده"}
                </Text>
              </View>
            </View>
            <KcalBand f={f.kcal} />
            <Text className="text-xs text-ink-2">محدوده خوب: {faInt(f.kcal.low)} تا {faInt(f.kcal.high)} کالری</Text>
          </Card>

          <Card n="۲" title="درشت‌مغذی‌ها">
            <MacroLine label="پروتئین" fact={f.protein} ok={f.protein.enough} ink="text-purple-ink" />
            <MacroLine label="کربوهیدرات" fact={f.carbs} ok={f.carbs.balanced} ink="text-carbs" />
            <MacroLine label="چربی" fact={f.fat} ok={f.fat.balanced} ink="text-fat-ink" />
          </Card>

          {f.heaviest_meal && (
            <Card n="۳" title="بیشترین سهم">
              <Text className="text-[15px]">
                {mealLabel(f.heaviest_meal.meal_type)}: {faInt(f.heaviest_meal.kcal)} کالری ({faInt(f.heaviest_meal.share * 100)}٪ روز)
              </Text>
              {f.top_kcal.length > 0 && <Text className="text-sm leading-6 text-ink-2">کالری: {f.top_kcal.map((t) => `${cleanName(t.name)} ${faInt(t.kcal)}`).join("، ")}</Text>}
              {f.top_fat.length > 0 && <Text className="text-sm leading-6 text-ink-2">چربی: {f.top_fat.map((t) => `${cleanName(t.name)} ${faInt(t.fat_g)} گرم`).join("، ")}</Text>}
            </Card>
          )}

          {r.analysis ? (
            <View accessibilityRole="summary" className="gap-3 rounded-card bg-purple-tint p-4">
              <View className="flex-row items-center gap-2">
                {nutiOn ? <Nuti mood={MOOD[f.kcal.status]} size={44} /> : <Sparkles color={purple} size={20} />}
                <Text className="font-strong text-base text-purple-ink">{nutiOn ? "تحلیل نوتی" : "تحلیل Nutivo"}</Text>
              </View>
              {r.analysis.analysis.map((p, i) => (
                <Text key={i} className="text-[15px] leading-7">{p}</Text>
              ))}
              <View className="gap-1.5 rounded-btn bg-surface p-3">
                <Text className="font-strong text-sm text-purple-ink">برای فردا</Text>
                {r.analysis.tomorrow.map((t, i) => (
                  <Text key={i} className="text-sm leading-6">• {t}</Text>
                ))}
              </View>
              <Text className="text-sm leading-6"><Text className="font-strong text-sm text-green-ink">نقطه قوت: </Text>{r.analysis.strength}</Text>
              <Text className="text-sm leading-6"><Text className="font-strong text-sm text-purple-ink">اولویت فردا: </Text>{r.analysis.priority}</Text>
            </View>
          ) : (
            <Text className="text-xs text-ink-2">تحلیل نوشته نشد؛ عددها بالا درست‌اند.</Text>
          )}
          {f.is_partial && <Text className="text-xs leading-6 text-ink-2">بخشی از مقدارها تخمینی است (از روی عکس یا واحد تقریبی).</Text>}
        </View>
      )}
    </Screen>
  );
}
