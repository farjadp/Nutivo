"use client";
import { dayTotals, macrosForGrams, streakStatus, type Goals, type MealType } from "@nutivo/core";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { confirmMealAction, discardDraftPhotoAction, draftMealAction } from "@/features/log-meal/api/actions";
import type { Draft, DraftItem } from "@/features/log-meal/model/draft";
import { localISO, preparePhoto } from "@/features/log-meal/model/photo";
import { ConfirmSheet } from "@/features/log-meal/ui/confirm-sheet";
import { SAMPLE_QUICK_MEALS, type LoggedItem, type QuickMeal } from "@/entities/day/sample";
import { sampleDraft } from "@/entities/day/sample-draft";
import { browserToday, clearLocalDay, isLocalSeeded, loadLocalDay, saveLocalDay, seedLocalSample } from "@/features/local-store/day-store";
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
  /** sample: demo data · live: Supabase + login · local: no login, saved in this browser */
  mode: "sample" | "live" | "local";
  quickMeals?: QuickMeal[];
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

export function TodayView({ today: todayProp, initialItems, goals: goalsProp, pastLogDates: pastProp, mode, quickMeals = SAMPLE_QUICK_MEALS }: Props) {
  const isSample = mode === "sample";
  const isLocal = mode === "local";
  const router = useRouter();
  const [localItems, setItems] = useState(initialItems);
  const items = mode === "live" ? initialItems : localItems;
  const [today, setToday] = useState(todayProp);
  const [goals, setGoals] = useState<Goals>(goalsProp);
  const [pastLogDates, setPast] = useState(pastProp);

  // Local review mode: read the day and goals stored in this browser.
  useEffect(() => {
    if (!isLocal) return;
    const t = browserToday();
    if (!isLocalSeeded()) seedLocalSample(t);
    const d = loadLocalDay(t);
    setToday(t);
    setItems(d.items);
    setPast(d.pastLogDates);
    if (d.goals) setGoals(d.goals);
  }, [isLocal]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [prevCount, setPrevCount] = useState(initialItems.length);
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
  const insight =
    items.length === 0
      ? { text: "امروز هنوز چیزی ثبت نشده.", hint: "اولین وعده را بنویس، مثلاً «دو کفگیر برنج و یه تیکه مرغ»، یا از غذایت عکس بگیر." }
      : insightFor(totals.remaining.kcal, totals.remaining.protein_g, totals.pct.protein);

  function addQuick(q: QuickMeal) {
    const added = q.build();
    setItems((prev) => {
      const next = [...prev, ...added];
      if (isLocal) saveLocalDay(today, next);
      return next;
    });
    setFresh(new Set(added.map((a) => a.key)));
    setUsedQuick((prev) => new Set(prev).add(q.id));
    setPulse((p) => p + 1);
    setNotice(`${q.label} ثبت شد.`);
  }

  // Live mode: replay the glow when the server sends back more items after a save.
  if (mode === "live" && initialItems.length !== prevCount) {
    setPrevCount(initialItems.length);
    if (initialItems.length > prevCount) {
      setFresh(new Set(initialItems.slice(prevCount).map((i) => i.key)));
      setPulse((p) => p + 1);
    }
  }

  async function requestDraft(form: FormData) {
    if (isSample) {
      setNotice("در حالت نمونه، ثبت واقعی خاموش است. وارد حساب شو.");
      return;
    }
    setBusy(true);
    form.set("now", localISO());
    const photo = form.get("photo");
    const res = await draftMealAction(form);
    setBusy(false);
    if (res.ok) {
      setSaveError(null);
      const preview = !res.data.photo_preview_url && photo instanceof File ? URL.createObjectURL(photo) : res.data.photo_preview_url;
      setDraft({ ...res.data, photo_preview_url: preview });
    } else setNotice(res.error);
  }

  function onText(text: string) {
    const f = new FormData();
    f.set("text", text);
    void requestDraft(f);
  }

  async function onPhoto(file: File, caption: string) {
    const f = new FormData();
    f.set("photo", await preparePhoto(file));
    if (caption) f.set("text", caption);
    void requestDraft(f);
  }

  function closeDraft() {
    if (draft?.photo_preview_url?.startsWith("blob:")) URL.revokeObjectURL(draft.photo_preview_url);
    setDraft(null);
  }

  function cancelDraft() {
    if (draft?.photo_path) void discardDraftPhotoAction(draft.photo_path);
    closeDraft();
  }

  function confirmLocal(meal_type: MealType, list: DraftItem[]) {
    if (!draft) return;
    const stamp = Date.now().toString(36);
    const added: LoggedItem[] = list.map((i, n) => {
      const food = draft.foods[i.food_id!]!;
      return {
        key: `l-${stamp}-${n}`,
        meal_type,
        name_raw: i.name_raw,
        qty: i.qty,
        unit: i.unit,
        prep_hint: i.prep_hint,
        confidence: i.confidence,
        needs_question: undefined,
        from_photo: i.from_photo,
        food,
        grams: i.grams!,
        macros: macrosForGrams(food, i.grams!),
        is_estimated: i.is_estimated,
        resolution: i.is_estimated ? "estimated_range" : "default_unit",
      };
    });
    const next = [...localItems, ...added];
    setItems(next);
    saveLocalDay(today, next);
    setFresh(new Set(added.map((a) => a.key)));
    setPulse((p) => p + 1);
    setNotice("ثبت شد.");
    closeDraft();
  }

  function reloadSample() {
    seedLocalSample(today);
    const d = loadLocalDay(today);
    setItems(d.items);
    setPast(d.pastLogDates);
    if (d.goals) setGoals(d.goals);
    setUsedQuick(new Set());
    setPulse((p) => p + 1);
    setNotice("داده نمونه بارگذاری شد.");
  }

  function openSampleDraft() {
    setSaveError(null);
    setDraft(sampleDraft(localISO()));
  }

  function resetLocal() {
    clearLocalDay(today);
    setItems([]);
    setNotice("داده‌های امروز پاک شد.");
  }

  function confirmDraft(meal_type: MealType, list: DraftItem[]) {
    if (!draft) return;
    if (isLocal) return confirmLocal(meal_type, list);
    startSaving(async () => {
      const res = await confirmMealAction({
        meal_type,
        raw_input: draft.raw_input,
        input_channel: draft.input_channel,
        photo_path: draft.photo_path,
        eaten_at: draft.eaten_at,
        items: list.map((i) => ({
          food_id: i.food_id!,
          name_raw: i.name_raw,
          qty: i.qty,
          unit: i.unit,
          grams: i.grams!,
          is_estimated: i.is_estimated,
          confidence: i.confidence,
        })),
      });
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      closeDraft();
      setNotice("ثبت شد.");
      router.refresh();
    });
  }

  function addToMeal(m: MealType) {
    const q = quickMeals.find((x) => x.meal_type === m && !usedQuick.has(x.id));
    if (q && (isSample || isLocal)) addQuick(q);
    else {
      setNotice("بنویس چی خوردی یا عکس بگیر.");
      document.getElementById("log-text")?.focus();
    }
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
          {isLocal && (
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-dashed border-line px-2.5 py-1 text-[11px] text-ink-2" title="بدون ورود؛ داده فقط در همین مرورگر ذخیره می‌شود">حالت بررسی</span>
              <button type="button" onClick={reloadSample} className="rounded-full px-2 py-1 text-[11px] text-green-ink hover:bg-mint">نمونه</button>
              {items.length > 0 && (
                <button type="button" onClick={resetLocal} className="rounded-full px-2 py-1 text-[11px] text-ink-2 hover:bg-track">پاک کردن امروز</button>
              )}
            </div>
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

      {draft && <ConfirmSheet draft={draft} saving={saving} error={saveError} onCancel={cancelDraft} onConfirm={confirmDraft} />}

      <div className="fixed inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-md border-t border-line/60 bg-ground/95 px-4 pt-2.5 pb-3 backdrop-blur-sm sm:rounded-t-[var(--radius-card)] sm:border-x">
          {notice && (
            <p role="status" key={notice} className="animate-rise mb-2 rounded-[var(--radius-btn)] bg-ink px-3 py-2 text-[13px] text-ground">
              {notice}
            </p>
          )}
          <Composer
            quickMeals={isSample || isLocal ? quickMeals : []}
            onSampleDraft={isLocal ? openSampleDraft : undefined}
            usedQuick={usedQuick}
            busy={busy}
            onQuick={addQuick}
            onText={onText}
            onPhoto={(f, c) => void onPhoto(f, c)}
          />
        </div>
        <div className="pb-[env(safe-area-inset-bottom)] bg-surface">
          <BottomNav active="/today" />
        </div>
      </div>
    </div>
  );
}
