"use client";
import { dayTotals, macrosForGrams, streakStatus, type Goals, type MealType } from "@nutivo/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { confirmMealAction, discardDraftPhotoAction, draftMealAction } from "@/features/log-meal/api/actions";
import type { Draft, DraftItem } from "@/features/log-meal/model/draft";
import { localISO, preparePhoto } from "@/features/log-meal/model/photo";
import { ConfirmSheet } from "@/features/log-meal/ui/confirm-sheet";
import { deleteEntryItemAction, updateEntryItemAction } from "@/features/edit-meal/api/actions";
import { EditItemSheet, type ItemEdit } from "@/features/edit-meal/ui/edit-item-sheet";
import { SAMPLE_QUICK_MEALS, type LoggedItem, type QuickMeal } from "@/entities/day/sample";
import { sampleDraft } from "@/entities/day/sample-draft";
import { browserToday, clearLocalDay, isLocalSeeded, loadLocalAll, saveLocalDay, seedLocalSample } from "@/features/local-store/day-store";
import { addDays, faDayLabel, faInt } from "@/shared/lib/format";
import { completeDay, DAY_WINDOW, estimatedMacros, groupMeals, statsComplete, statsOf, type DayStats } from "../model/day";
import { DayStrip, type DayMark } from "./day-strip";
import { BottomNav } from "./bottom-nav";
import { CalorieRing } from "./calorie-ring";
import { Composer } from "./composer";
import { InsightCard } from "./insight-card";
import { useNutiEnabled } from "@/features/mascot/model/enabled";
import { daySeed, nutiSay, type NutiSituation } from "@/features/mascot/model/lines";
import { NutiCard } from "@/features/mascot/ui/nuti-card";
import { MacroBars } from "./macro-bars";
import { MealList } from "./meal-list";
import { StreakCard } from "./streak-card";

interface Props {
  today: string;
  initialItems: LoggedItem[];
  goals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  pastLogDates: string[];
  /** Live mode: the day being shown (YYYY-MM-DD) and per-day totals for the strip. */
  date?: string;
  stats?: Record<string, DayStats>;
  /** sample: demo data · live: Supabase + login · local: no login, saved in this browser */
  mode: "sample" | "live" | "local";
  quickMeals?: QuickMeal[];
}

/** Protein ideas with numbers from the seed foods (packages/db). Skips anything already eaten today. */
const PROTEIN_IDEAS = [
  { id: "fa:jujeh-kabab", text: "یک سیخ جوجه‌کباب حدود ۳۶ گرم پروتئین و ۲۲۰ کالری دارد." },
  { id: "fa:tokhm-morgh", text: "دو تخم‌مرغ حدود ۱۳ گرم پروتئین و ۱۴۰ کالری دارد." },
  { id: "fa:mast", text: "یک کاسه ماست حدود ۵ گرم پروتئین و ۹۰ کالری دارد." },
  { id: "fa:morgh-grill-sineh", text: "یک تکه سینه مرغ گریل حدود ۳۷ گرم پروتئین و ۲۰۰ کالری دارد." },
  { id: "fa:adasi", text: "یک کاسه عدسی حدود ۱۵ گرم پروتئین و ۲۶۰ کالری دارد." },
];

function insightFor(remainingKcal: number, remainingProtein: number, proteinPct: number, eaten: Set<string> = new Set()) {
  if (remainingKcal < 0) {
    return {
      text: `امروز حدود ${faInt(-remainingKcal)} کالری بیشتر از هدف دریافت کرده‌ای.`,
      hint: "روند کلی هفته برای ارزیابی مهم‌تر از نتیجه یک روز است.",
    };
  }
  if (remainingProtein > 20 && proteinPct < 0.75) {
    return {
      text: `تا اینجا ${faInt(proteinPct * 100)}٪ پروتئین روز را گرفته‌ای و ${faInt(remainingProtein)} گرم دیگر تا هدف مانده.`,
      hint: `${faInt(remainingKcal)} کالری جا داری. ${(PROTEIN_IDEAS.find((p) => !eaten.has(p.id)) ?? PROTEIN_IDEAS[1]!).text}`,
    };
  }
  return {
    text: "پروتئین امروز در مسیر درستی است.",
    hint: remainingKcal > 150 ? `${faInt(remainingKcal)} کالری برای باقی روز جا داری.` : "برای امروز تقریباً به هدف رسیده‌ای.",
  };
}

export function TodayView({ today: todayProp, date: dateProp, stats: statsProp, initialItems, goals: goalsProp, pastLogDates: pastProp, mode, quickMeals = SAMPLE_QUICK_MEALS }: Props) {
  const isSample = mode === "sample";
  const isLocal = mode === "local";
  const router = useRouter();
  const isLive = mode === "live";
  // Local/sample modes keep every day in memory (mirrored to localStorage in local mode).
  const [localDays, setLocalDays] = useState<Record<string, LoggedItem[]>>({ [todayProp]: initialItems });
  const [viewLocal, setViewLocal] = useState(todayProp);
  const viewDate = isLive ? (dateProp ?? todayProp) : viewLocal;
  const localItems = localDays[viewDate] ?? [];
  /** Change one day's items; the date is explicit so delayed commits never land on another day. */
  const updateDay = useCallback(
    (date: string, fn: (prev: LoggedItem[]) => LoggedItem[]) =>
      setLocalDays((prev) => {
        const next = fn(prev[date] ?? []);
        if (isLocal) saveLocalDay(date, next);
        return { ...prev, [date]: next };
      }),
    [isLocal],
  );
  const [navPending, startNav] = useTransition();
  const [slide, setSlide] = useState<"newer" | "older" | null>(null);
  // Deleted items stay hidden for a few seconds (undo window) before the delete is committed.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const allItems = isLive ? initialItems : localItems;
  const items = useMemo(() => (hidden.size ? allItems.filter((i) => !hidden.has(i.key)) : allItems), [allItems, hidden]);
  const [today, setToday] = useState(todayProp);
  const [goals, setGoals] = useState<Goals>(goalsProp);
  const pastLogDates = pastProp;

  // Local review mode: read the day and goals stored in this browser.
  useEffect(() => {
    if (!isLocal) return;
    const t = browserToday();
    if (!isLocalSeeded()) seedLocalSample(t);
    const d = loadLocalAll();
    setToday(t);
    setViewLocal(t);
    setLocalDays(d.days);
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
  const [toast, setToast] = useState<{ id: number; text: string; action?: { label: string; run: () => void } } | null>(null);
  const setNotice = useCallback((text: string | null, action?: { label: string; run: () => void }) => setToast(text ? { id: Date.now(), text, action } : null), []);
  const [editing, setEditing] = useState<LoggedItem | null>(null);
  const [editSaving, startEditSaving] = useTransition();
  const [editError, setEditError] = useState<string | null>(null);
  const pendingDeletes = useRef(new Map<string, { timer: number; commit: () => void }>());
  const [nutiOn] = useNutiEnabled();
  const [lastEvent, setLastEvent] = useState<{ kind: "logged" | "photo"; n: number } | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (!lastEvent) return;
    const t = window.setTimeout(() => setLastEvent(null), 7000);
    return () => window.clearTimeout(t);
  }, [lastEvent]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.action ? 6000 : 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Commit pending deletes if the page is closed or left during the undo window.
  useEffect(() => {
    const pending = pendingDeletes.current;
    const flush = () => {
      for (const [, p] of pending) {
        window.clearTimeout(p.timer);
        p.commit();
      }
      pending.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const totals = useMemo(() => dayTotals(items, goals), [items, goals]);
  const est = useMemo(() => estimatedMacros(items), [items]);
  const groups = useMemo(() => groupMeals(items), [items]);
  const complete = useMemo(() => completeDay(items, goals), [items, goals]);
  const isToday = viewDate === today;
  const dayStats = useMemo(() => {
    const base: Record<string, DayStats> = isLive ? { ...(statsProp ?? {}) } : Object.fromEntries(Object.entries(localDays).map(([d, list]) => [d, statsOf(list)]));
    base[viewDate] = statsOf(items);
    return base;
  }, [isLive, statsProp, localDays, viewDate, items]);
  const logDates = useMemo(() => {
    const set = new Set(pastLogDates.filter((d) => d < today));
    for (const [d, st] of Object.entries(dayStats)) {
      if (d > today) continue;
      if (st.meals > 0) set.add(d);
      else set.delete(d);
    }
    return [...set].sort();
  }, [pastLogDates, dayStats, today]);
  const loggedToday = logDates.includes(today);
  const marks = useMemo(() => {
    const m: Record<string, DayMark> = {};
    for (const d of logDates) m[d] = statsComplete(dayStats[d], goals) ? "complete" : "logged";
    return m;
  }, [logDates, dayStats, goals]);
  const oldest = addDays(today, -(DAY_WINDOW - 1));

  function goTo(d: string) {
    if (d === viewDate || d > today || d < oldest) return;
    setSlide(d > viewDate ? "newer" : "older");
    setEditing(null);
    if (isLive) startNav(() => router.push(d === today ? "/today" : `/today?d=${d}`, { scroll: false }));
    else setViewLocal(d);
  }

  // Swipe on the summary card. RTL: newer days lie to the left, so a rightward swipe moves to the newer day.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  function onPointerDown(e: React.PointerEvent) {
    swipe.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: React.PointerEvent) {
    const s0 = swipe.current;
    swipe.current = null;
    if (!s0) return;
    const dx = e.clientX - s0.x;
    if (Math.abs(dx) < 56 || Math.abs(e.clientY - s0.y) > Math.abs(dx)) return;
    goTo(addDays(viewDate, dx > 0 ? 1 : -1));
  }
  const streak = useMemo(() => streakStatus({ logDates, today, graceDaysPerWeek: 1 }), [logDates, today]);
  const insight =
    items.length === 0
      ? { text: "امروز هنوز چیزی ثبت نشده.", hint: "اولین وعده را بنویس، مثلاً «دو کفگیر برنج و یه تیکه مرغ»، یا از غذایت عکس بگیر." }
      : insightFor(totals.remaining.kcal, totals.remaining.protein_g, totals.pct.protein, new Set(items.map((i) => i.food.id)));

  const dayTitle = isToday ? "امروز" : viewDate === addDays(today, -1) ? "دیروز" : faDayLabel(viewDate).split(" ")[0]!;
  const pastSummary = items.length
    ? {
        text: `${dayTitle} ${faInt(totals.macros.kcal)} کالری و ${faInt(totals.macros.protein_g)} گرم پروتئین ثبت شده.`,
        hint: complete.done ? "روز کامل بود." : "اگر چیزی جا افتاده، همین پایین بنویس تا به همین روز اضافه شود.",
      }
    : { text: `برای ${dayTitle} چیزی ثبت نشده.`, hint: "اگر یادت هست چه خوردی، همین پایین بنویس؛ به همین روز اضافه می‌شود." };

  useEffect(() => {
    if (!complete.done || !isToday) return;
    try {
      const key = "nutivo.nuti.cheered";
      if (window.localStorage.getItem(key) === today) return;
      window.localStorage.setItem(key, today);
    } catch {
      // storage blocked: still celebrate this session
    }
    setCelebrate(true);
    const t = window.setTimeout(() => setCelebrate(false), 4000);
    return () => window.clearTimeout(t);
  }, [complete.done, isToday, today]);

  const nuti = (() => {
    const hour = new Date().getHours();
    let sit: NutiSituation;
    const vars: Record<string, string> = {
      protein: faInt(Math.max(0, totals.remaining.protein_g)),
      kcal: faInt(Math.max(0, totals.remaining.kcal)),
      over: faInt(Math.max(0, -totals.remaining.kcal)),
      streak: faInt(streak.current),
    };
    if (celebrate) sit = "complete";
    else if (lastEvent) sit = lastEvent.kind;
    else if (complete.done) sit = "complete";
    else if (items.length === 0) sit = hour >= 22 ? "night" : "empty";
    else if (totals.remaining.kcal < 0) sit = "over";
    else if (totals.pct.protein < 0.75 && totals.remaining.protein_g > 20) sit = "proteinLow";
    else if (streak.current >= 3 && daySeed(today) % 3 === 0) sit = "streak";
    else sit = "onTrack";
    return nutiSay(sit, vars, daySeed(today, lastEvent?.n ?? items.length));
  })();

  function addQuick(q: QuickMeal) {
    const added = q.build();
    updateDay(viewDate, (prev) => [...prev, ...added]);
    setFresh(new Set(added.map((a) => a.key)));
    setUsedQuick((prev) => new Set(prev).add(q.id));
    setPulse((p) => p + 1);
    setLastEvent({ kind: "logged", n: Date.now() });
    setNotice(`${q.label} ثبت شد.`);
  }

  // Live mode: a new day from the server is not a "new log"; reset the counter without the glow.
  const [prevDate, setPrevDate] = useState(viewDate);
  if (isLive && viewDate !== prevDate) {
    setPrevDate(viewDate);
    setPrevCount(initialItems.length);
  }
  // Live mode: replay the glow when the server sends back more items after a save.
  else if (isLive && initialItems.length !== prevCount) {
    setPrevCount(initialItems.length);
    if (initialItems.length > prevCount) {
      setFresh(new Set(initialItems.slice(prevCount).map((i) => i.key)));
      setPulse((p) => p + 1);
      setLastEvent({ kind: initialItems.slice(prevCount).some((i) => i.from_photo) ? "photo" : "logged", n: Date.now() });
    }
  }

  async function requestDraft(form: FormData) {
    if (isSample) {
      setNotice("در حالت نمونه، ثبت واقعی خاموش است. وارد حساب شو.");
      return;
    }
    setBusy(true);
    form.set("now", nowForView());
    const photo = form.get("photo");
    const res = await draftMealAction(form);
    setBusy(false);
    if (res.ok) {
      setSaveError(null);
      const preview = !res.data.photo_preview_url && photo instanceof File ? URL.createObjectURL(photo) : res.data.photo_preview_url;
      setDraft({ ...res.data, photo_preview_url: preview });
    } else setNotice(res.error);
  }

  /** Logging on a past day keeps the current clock time but moves it to that date. */
  function nowForView(): string {
    if (isToday) return localISO();
    const t = new Date();
    const hh = String(t.getHours()).padStart(2, "0");
    const mm = String(t.getMinutes()).padStart(2, "0");
    return localISO(new Date(`${viewDate}T${hh}:${mm}:00`));
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
    updateDay(viewDate, (prev) => [...prev, ...added]);
    setFresh(new Set(added.map((a) => a.key)));
    setPulse((p) => p + 1);
    setLastEvent({ kind: list.some((i) => i.from_photo) ? "photo" : "logged", n: Date.now() });
    setNotice("ثبت شد.");
    closeDraft();
  }

  function reloadSample() {
    seedLocalSample(today);
    const d = loadLocalAll();
    setLocalDays(d.days);
    setViewLocal(today);
    if (d.goals) setGoals(d.goals);
    setUsedQuick(new Set());
    setPulse((p) => p + 1);
    setNotice("داده نمونه بارگذاری شد.");
  }

  function openSampleDraft() {
    setSaveError(null);
    setDraft(sampleDraft(nowForView()));
  }

  function resetLocal() {
    clearLocalDay(viewDate);
    setLocalDays((prev) => ({ ...prev, [viewDate]: [] }));
    setNotice(isToday ? "داده‌های امروز پاک شد." : "داده‌های این روز پاک شد.");
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

  function saveEdit(edit: ItemEdit) {
    const it = editing;
    if (!it) return;
    setEditError(null);
    if (mode !== "live") {
      const updated: LoggedItem = {
        ...it,
        food: edit.food,
        qty: edit.qty,
        unit: edit.unit,
        grams: edit.grams,
        is_estimated: edit.is_estimated,
        macros: macrosForGrams(edit.food, edit.grams),
        resolution: edit.unit === "گرم" ? "exact" : it.resolution,
      };
      updateDay(viewDate, (prev) => prev.map((x) => (x.key === it.key ? updated : x)));
      setFresh(new Set([it.key]));
      setPulse((p) => p + 1);
      setEditing(null);
      setNotice("تغییر ذخیره شد.");
      return;
    }
    startEditSaving(async () => {
      const res = await updateEntryItemAction({ item_id: it.key, food_id: edit.food.id, qty: edit.qty, unit: edit.unit, grams: edit.grams, is_estimated: edit.is_estimated });
      if (!res.ok) {
        setEditError(res.error);
        return;
      }
      setEditing(null);
      setFresh(new Set([it.key]));
      setPulse((p) => p + 1);
      setNotice("تغییر ذخیره شد.");
      router.refresh();
    });
  }

  function deleteItem(it: LoggedItem) {
    const day = viewDate;
    setEditing(null);
    setEditError(null);
    setLeaving((prev) => new Set(prev).add(it.key));
    window.setTimeout(() => {
      setLeaving((prev) => {
        const n = new Set(prev);
        n.delete(it.key);
        return n;
      });
      setHidden((prev) => new Set(prev).add(it.key));
      setPulse((p) => p + 1);
    }, 260);

    const unhide = () =>
      setHidden((prev) => {
        const n = new Set(prev);
        n.delete(it.key);
        return n;
      });
    const commit = () => {
      if (mode === "live") {
        void deleteEntryItemAction(it.key).then((res) => {
          if (!res.ok) {
            unhide();
            setNotice(res.error);
          } else router.refresh();
        });
      } else {
        updateDay(day, (prev) => prev.filter((x) => x.key !== it.key));
        unhide();
      }
    };
    const timer = window.setTimeout(() => {
      pendingDeletes.current.delete(it.key);
      commit();
    }, 6000);
    pendingDeletes.current.set(it.key, { timer, commit });

    setNotice(`${it.food.name_fa} حذف شد.`, {
      label: "برگردان",
      run: () => {
        const p = pendingDeletes.current.get(it.key);
        if (!p) return;
        window.clearTimeout(p.timer);
        pendingDeletes.current.delete(it.key);
        unhide();
        setFresh(new Set([it.key]));
        setPulse((n) => n + 1);
        setNotice("برگشت.");
      },
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
          <div key={viewDate} className="min-w-0 shrink-0 animate-[fade_240ms_ease-out_both]">
            <p className="whitespace-nowrap text-[13px] text-ink-2">{faDayLabel(viewDate)}</p>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{dayTitle}</h1>
              {!isToday && (
                <button type="button" onClick={() => goTo(today)} className="animate-rise whitespace-nowrap rounded-full bg-mint px-2.5 py-1 text-[12px] font-semibold text-green-ink">
                  برو به امروز
                </button>
              )}
            </div>
          </div>
          {isSample && (
            <span className="rounded-full border border-dashed border-line px-2.5 py-1 text-[11px] text-ink-2">داده نمونه</span>
          )}
          {isLocal && (
            <div className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1">
              <span className="whitespace-nowrap rounded-full border border-dashed border-line px-2.5 py-1 text-[11px] text-ink-2" title="بدون ورود؛ داده فقط در همین مرورگر ذخیره می‌شود">حالت بررسی</span>
              <button type="button" onClick={reloadSample} className="whitespace-nowrap rounded-full px-2 py-1 text-[11px] text-green-ink hover:bg-mint">نمونه</button>
              {items.length > 0 && (
                <button type="button" onClick={resetLocal} className="whitespace-nowrap rounded-full px-2 py-1 text-[11px] text-ink-2 hover:bg-track">پاک کردن روز</button>
              )}
            </div>
          )}
        </header>

        <DayStrip today={today} selected={viewDate} marks={marks} onSelect={goTo} />

        <div className={`transition-opacity duration-200 ${navPending ? "opacity-60" : ""}`}>
        <section
          aria-label={`کالری ${dayTitle}`}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipe.current = null)}
          className="mt-3 touch-pan-y rounded-[var(--radius-card)] border border-line bg-surface px-4 pt-6 pb-5 shadow-[var(--shadow-soft)]"
        >
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

        <div key={viewDate} className={`mt-4 grid gap-4 ${slide === "newer" ? "animate-day-newer" : slide === "older" ? "animate-day-older" : ""}`}>
          {!isToday ? (
            <InsightCard text={pastSummary.text} hint={pastSummary.hint} />
          ) : nutiOn ? (
            <NutiCard mood={nuti.mood} text={nuti.text} hint={items.length ? insight.hint : undefined} hopKey={pulse} celebrate={celebrate} />
          ) : (
            <InsightCard text={insight.text} hint={insight.hint} />
          )}
          {isToday && <StreakCard today={today} logDates={logDates} current={streak.current} loggedToday={loggedToday} complete={complete} />}
          <MealList
            title={isToday ? "وعده‌های امروز" : `وعده‌های ${dayTitle}`}
            groups={groups}
            freshKeys={fresh}
            leavingKeys={leaving}
            onAdd={addToMeal}
            onEdit={(it) => {
              setEditError(null);
              setEditing(it);
            }}
          />
        </div>
        </div>
      </main>

      {editing && (
        <EditItemSheet
          key={editing.key}
          item={editing}
          saving={editSaving}
          error={editError}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
          onDelete={() => deleteItem(editing)}
        />
      )}
      {draft && <ConfirmSheet draft={draft} saving={saving} error={saveError} onCancel={cancelDraft} onConfirm={confirmDraft} nuti={nutiOn} />}

      <div className="fixed inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-md border-t border-line/60 bg-ground/95 px-4 pt-2.5 pb-3 backdrop-blur-sm sm:rounded-t-[var(--radius-card)] sm:border-x">
          {!isToday && !toast && (
            <p className="mb-2 text-center text-[12px] text-ink-2">
              ثبت برای <span className="font-semibold text-green-ink">{dayTitle}</span>
            </p>
          )}
          {toast && (
            <div role="status" key={toast.id} className="animate-rise mb-2 flex items-center justify-between gap-3 rounded-[var(--radius-btn)] bg-ink py-2 ps-3 pe-1.5 text-[13px] text-ground">
              <span className="min-w-0">{toast.text}</span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.run();
                  }}
                  className="shrink-0 rounded-[8px] px-2.5 py-1 font-semibold text-ground underline decoration-ground/40 underline-offset-4 hover:bg-ground/10"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          )}
          <Composer
            quickMeals={isSample || isLocal ? quickMeals : []}
            onSampleDraft={isLocal ? openSampleDraft : undefined}
            usedQuick={usedQuick}
            busy={busy}
            nuti={nutiOn}
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
