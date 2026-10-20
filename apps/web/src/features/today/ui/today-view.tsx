"use client";
import { dayTotals, streakStatus, type MealType } from "@nutivo/core";
import { useEffect, useMemo, useState } from "react";
import { SAMPLE_QUICK_MEALS, type LoggedItem, type QuickMeal } from "@/entities/day/sample";
import { faDayLabel, faInt } from "@/shared/lib/format";
import { completeDay, estimatedMacros, groupMeals } from "../model/day";
import { BottomNav } from "./bottom-nav";
import { CalorieRing } from "./calorie-ring";
import { Composer } from "./composer";
import { InsightCard } from "./insight-card";
import { MacroBars } from "./macro-bars";
import { MealList } from "./meal-list";
import { StreakCard } from "./streak-card";

interface Props {
  today: string;
  initialItems: LoggedItem[];
  goals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  pastLogDates: string[];
  isSample: boolean;
}

function insightFor(remainingKcal: number, remainingProtein: number, proteinPct: number) {
  if (remainingKcal < 0) {
    return {
      text: `امروز حدود ${faInt(-remainingKcal)} کالری بیشتر از هدف دریافت کرده‌ای.`,
      hint: "روند کلی هفته برای ارزیابی مهم‌تر از نتیجه یک روز است.",
    };
  }
  if (remainingProtein > 20 && proteinPct < 0.75) {
    return {
      text: `تا اینجا ${faInt(proteinPct * 100)}٪ پروتئین روز را گرفته‌ای و ${faInt(remainingProtein)} گرم دیگر تا هدف مانده.`,
      hint: `${faInt(remainingKcal)} کالری جا داری. یک سیخ جوجه‌کباب حدود ۴۵ گرم پروتئین و ۲۷۰ کالری دارد.`,
    };
  }
  return {
    text: "پروتئین امروز در مسیر درستی است.",
    hint: remainingKcal > 150 ? `${faInt(remainingKcal)} کالری برای باقی روز جا داری.` : "برای امروز تقریباً به هدف رسیده‌ای.",
  };
}

export function TodayView({ today, initialItems, goals, pastLogDates, isSample }: Props) {
  const [items, setItems] = useState(initialItems);
  const [usedQuick, setUsedQuick] = useState<Set<string>>(new Set());
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [pulse, setPulse] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(t);
  }, [notice]);

  const totals = useMemo(() => dayTotals(items, goals), [items, goals]);
  const est = useMemo(() => estimatedMacros(items), [items]);
  const groups = useMemo(() => groupMeals(items), [items]);
  const complete = useMemo(() => completeDay(items, goals), [items, goals]);
  const loggedToday = items.length > 0;
  const logDates = useMemo(() => (loggedToday ? [...pastLogDates, today] : pastLogDates), [pastLogDates, today, loggedToday]);
  const streak = useMemo(() => streakStatus({ logDates, today, graceDaysPerWeek: 1 }), [logDates, today]);
  const insight = insightFor(totals.remaining.kcal, totals.remaining.protein_g, totals.pct.protein);

  function addQuick(q: QuickMeal) {
    const added = q.build();
    setItems((prev) => [...prev, ...added]);
    setFresh(new Set(added.map((a) => a.key)));
    setUsedQuick((prev) => new Set(prev).add(q.id));
    setPulse((p) => p + 1);
    setNotice(`${q.label} ثبت شد.`);
  }

  function addToMeal(m: MealType) {
    const q = SAMPLE_QUICK_MEALS.find((x) => x.meal_type === m && !usedQuick.has(x.id));
    if (q) addQuick(q);
    else setNotice("برای این وعده بنویس یا عکس بگیر.");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[max(20px,env(safe-area-inset-top))] pb-56">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] text-ink-2">{faDayLabel(today)}</p>
            <h1 className="text-2xl font-bold">امروز</h1>
          </div>
          {isSample && (
            <span className="rounded-full border border-dashed border-line px-2.5 py-1 text-[11px] text-ink-2">داده نمونه</span>
          )}
        </header>

        <section aria-label="کالری امروز" className="mt-5 rounded-[var(--radius-card)] border border-line bg-surface px-4 pt-6 pb-5 shadow-[var(--shadow-soft)]">
          <CalorieRing consumed={totals.macros.kcal} goal={goals.kcal} estimated={est.kcal} pulseKey={pulse} />
          <div className="mt-7">
            <MacroBars
              rows={[
                { key: "protein", label: "پروتئین", consumed: totals.macros.protein_g, goal: goals.protein_g, estimated: est.protein_g, fillClass: "fill-purple", ink: "text-purple-ink" },
                { key: "carbs", label: "کربوهیدرات", consumed: totals.macros.carbs_g, goal: goals.carbs_g, estimated: est.carbs_g, fillClass: "fill-carbs", ink: "text-carbs" },
                { key: "fat", label: "چربی", consumed: totals.macros.fat_g, goal: goals.fat_g, estimated: est.fat_g, fillClass: "fill-fat", ink: "text-fat-ink" },
              ]}
            />
          </div>
        </section>

        <div className="mt-4 grid gap-4">
          <InsightCard text={insight.text} hint={insight.hint} />
          <StreakCard today={today} logDates={logDates} current={streak.current} loggedToday={loggedToday} complete={complete} />
          <MealList groups={groups} freshKeys={fresh} onAdd={addToMeal} />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-md border-t border-line/60 bg-ground/95 px-4 pt-2.5 pb-3 backdrop-blur-sm sm:rounded-t-[var(--radius-card)] sm:border-x">
          {notice && (
            <p role="status" key={notice} className="animate-rise mb-2 rounded-[var(--radius-btn)] bg-ink px-3 py-2 text-[13px] text-ground">
              {notice}
            </p>
          )}
          <Composer quickMeals={SAMPLE_QUICK_MEALS} usedQuick={usedQuick} onQuick={addQuick} onNotice={setNotice} />
        </div>
        <div className="pb-[env(safe-area-inset-bottom)] bg-surface">
          <BottomNav active="/today" />
        </div>
      </div>
    </div>
  );
}
