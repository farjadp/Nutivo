"use client";
import { buildDailyReport, reportFacts, type Goals, type ReportAnalysis } from "@nutivo/core";
import { RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { LoggedItem } from "@/entities/day/sample";
import { browserToday, isLocalSeeded, loadLocalAll, seedLocalSample } from "@/features/local-store/day-store";
import { useNutiEnabled } from "@/features/mascot/model/enabled";
import { Nuti } from "@/features/mascot/ui/nuti";
import { DAY_WINDOW, estimatedMacros, statsComplete, statsOf, type DayStats } from "@/features/today/model/day";
import { BottomNav } from "@/features/today/ui/bottom-nav";
import { DayStrip, type DayMark } from "@/features/today/ui/day-strip";
import { MacroBars } from "@/features/today/ui/macro-bars";
import { addDays, faFullDate, faInt } from "@/shared/lib/format";
import { generateLocalReportAction, generateReportAction } from "../api/actions";
import { itemsHash } from "../model/hash";
import { AnalysisBody, DayChecks, FoodTable, KcalSection, SectionTitle, Summary } from "./report-parts";

interface Props {
  mode: "sample" | "local" | "live";
  today: string;
  date: string;
  items: LoggedItem[];
  goals: Goals;
  stats?: Record<string, DayStats>;
  stored?: { analysis: ReportAnalysis | null; hash: string | null } | null;
}

const CACHE_KEY = "nutivo.reports.v1";
type Cache = Record<string, { analysis: ReportAnalysis; hash: string }>;
function readCache(): Cache {
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "{}") as Cache;
  } catch {
    return {};
  }
}
function writeCache(c: Cache) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    // storage blocked: the report still shows for this session
  }
}

export function ReportView({ mode, today: todayProp, date: dateProp, items: itemsProp, goals: goalsProp, stats: statsProp, stored }: Props) {
  const router = useRouter();
  const isLive = mode === "live";
  const [today, setToday] = useState(todayProp);
  const [goals, setGoals] = useState(goalsProp);
  const [days, setDays] = useState<Record<string, LoggedItem[]>>({ [dateProp]: itemsProp });
  const [viewLocal, setViewLocal] = useState(dateProp);
  const viewDate = isLive ? dateProp : viewLocal;
  const items = useMemo(() => (isLive ? itemsProp : days[viewDate] ?? []), [isLive, itemsProp, days, viewDate]);
  const [cache, setCache] = useState<Cache>({});
  const [pending, startGen] = useTransition();
  const [navPending, startNav] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nutiOn] = useNutiEnabled();

  useEffect(() => {
    if (mode !== "local") return;
    const t = browserToday();
    if (!isLocalSeeded()) seedLocalSample(t);
    const all = loadLocalAll();
    setToday(t);
    setDays(all.days);
    if (all.goals) setGoals(all.goals);
    setCache(readCache());
    // Default to yesterday before the evening, when today's report would be mostly empty.
    setViewLocal(new Date().getHours() < 18 ? addDays(t, -1) : t);
  }, [mode]);

  const report = useMemo(() => buildDailyReport({ date: viewDate, items, goals }), [viewDate, items, goals]);
  const facts = useMemo(() => reportFacts(report, goals), [report, goals]);
  const est = useMemo(() => estimatedMacros(items), [items]);
  const hash = useMemo(() => itemsHash(items), [items]);

  const saved = isLive ? (stored?.analysis ? { analysis: stored.analysis, hash: stored.hash ?? "" } : null) : cache[viewDate] ?? null;
  const [fresh, setFresh] = useState<{ date: string; analysis: ReportAnalysis; hash: string } | null>(null);
  const current = fresh?.date === viewDate ? fresh : saved;
  const stale = Boolean(current && current.hash !== hash);

  const marks = useMemo(() => {
    const all: Record<string, DayStats> = isLive ? { ...(statsProp ?? {}) } : Object.fromEntries(Object.entries(days).map(([d, l]) => [d, statsOf(l)]));
    const m: Record<string, DayMark> = {};
    for (const [d, s] of Object.entries(all)) if (s.meals > 0) m[d] = statsComplete(s, goals) ? "complete" : "logged";
    return m;
  }, [isLive, statsProp, days, goals]);

  function goTo(d: string) {
    if (d > today || d < addDays(today, -(DAY_WINDOW - 1))) return;
    setError(null);
    if (isLive) startNav(() => router.push(`/report?d=${d}`, { scroll: false }));
    else setViewLocal(d);
  }

  function generate() {
    setError(null);
    startGen(async () => {
      const res = isLive
        ? await generateReportAction(viewDate)
        : await generateLocalReportAction({
            date: viewDate,
            today,
            goals,
            items: items.map((i) => ({ key: i.key, food_id: i.food.id, grams: i.grams, qty: i.qty, unit: i.unit, name_raw: i.name_raw, meal_type: i.meal_type, is_estimated: i.is_estimated, confidence: i.confidence, from_photo: i.from_photo })),
          });
      if (!res.ok) return setError(res.error);
      // The hash the page compares against is the client's own, so a stale flag only appears after a real edit.
      setFresh({ date: viewDate, analysis: res.analysis, hash });
      if (!isLive) {
        const next = { ...readCache(), [viewDate]: { analysis: res.analysis, hash } };
        writeCache(next);
        setCache(next);
      }
    });
  }

  const dayOpen = viewDate === today && new Date().getHours() < 21;

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[max(20px,env(safe-area-inset-top))] pb-28">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">گزارش تغذیه روزانه</h1>
            <p key={viewDate} className="animate-[fade_240ms_ease-out_both] text-[13px] text-ink-2">{faFullDate(viewDate)}</p>
          </div>
          {facts.logged && facts.is_partial && (
            <span className="mt-1 shrink-0 rounded-full border border-dashed border-fat px-2.5 py-1 text-[11px] font-medium text-fat-ink" title="بخشی از مقدارها تخمینی است">
              تخمینی
            </span>
          )}
        </header>

        <DayStrip today={today} selected={viewDate} marks={marks} onSelect={goTo} />

        <div key={viewDate} className={`mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 animate-rise transition-opacity duration-200 ${navPending ? "opacity-60" : ""}`}>
          {dayOpen && facts.logged && (
            <p className="rounded-[var(--radius-btn)] bg-track px-3 py-2 text-[13px] text-ink-2">روز هنوز تمام نشده؛ این گزارش تا الان است و ساعت ۲۱:۳۰ کامل می‌شود.</p>
          )}

          {!facts.logged ? (
            <section className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line bg-surface px-6 py-10 text-center">
              {nutiOn && <Nuti mood="sleepy" size={88} label="" />}
              <p className="text-base font-semibold">برای این روز چیزی ثبت نشده.</p>
              <p className="text-[13px] text-ink-2">گزارش از وعده‌های تأییدشده ساخته می‌شود.</p>
              <Link href={viewDate === today ? "/today" : `/today?d=${viewDate}`} className="mt-1 rounded-[var(--radius-btn)] bg-green-ink px-4 py-2.5 text-sm font-semibold text-surface">
                ثبت وعده
              </Link>
            </section>
          ) : (
            <>
              <KcalSection facts={facts} estimated={est.kcal} />

              <section aria-labelledby="r-macros" className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)]">
                <SectionTitle n="۲"><span id="r-macros">ماکروها</span></SectionTitle>
                <div className="mt-4">
                  <MacroBars
                    rows={[
                      { key: "protein", label: "پروتئین", consumed: facts.protein.consumed, goal: goals.protein_g, estimated: est.protein_g, fillClass: "fill-purple", ink: "text-purple-ink" },
                      { key: "carbs", label: "کربوهیدرات", consumed: facts.carbs.consumed, goal: goals.carbs_g, estimated: est.carbs_g, fillClass: "fill-carbs", ink: "text-carbs" },
                      { key: "fat", label: "چربی", consumed: facts.fat.consumed, goal: goals.fat_g, estimated: est.fat_g, fillClass: "fill-fat", ink: "text-fat-ink" },
                    ]}
                  />
                </div>
              </section>

              <FoodTable meals={report.per_meal} totals={report.totals.macros} partial={facts.is_partial} />
              {facts.kcal_mismatch && (
                <p className="-mt-2 px-1 text-xs leading-5 text-ink-2">
                  جمع کالری ({faInt(facts.kcal_mismatch.reported)}) با انرژی حاصل از ماکروها ({faInt(facts.kcal_mismatch.from_macros)}) کمی فرق دارد؛ دلیلش گرد کردن یا داده‌های تقریبی است.
                </p>
              )}

              <section aria-labelledby="r-analysis" className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)]">
                <SectionTitle n="۴"><span id="r-analysis">تحلیل روز</span></SectionTitle>
                <div className="mt-4">
                  <DayChecks facts={facts} />
                </div>
              </section>

              <section aria-labelledby="r-nuti" className="rounded-[var(--radius-card)] bg-purple-tint p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="r-nuti" className="flex items-center gap-2 text-base font-semibold text-purple-ink">
                    {nutiOn ? <Nuti mood={pending ? "think" : "happy"} size={40} label="" /> : <Sparkles size={18} strokeWidth={2} aria-hidden />}
                    {nutiOn ? "تحلیل نوتی" : "تحلیل Nutivo"}
                  </h2>
                  {current && !pending && (
                    <button type="button" onClick={generate} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-purple-ink hover:bg-surface/70">
                      <RefreshCw size={14} strokeWidth={2} aria-hidden />
                      {stale ? "به‌روزرسانی" : "دوباره"}
                    </button>
                  )}
                </div>
                <div className="mt-3">
                  {pending ? (
                    <div className="grid gap-2" aria-live="polite" aria-busy="true">
                      <span className="sr-only">در حال نوشتن تحلیل…</span>
                      {[92, 80, 86, 60].map((w) => (
                        <span key={w} className={`h-3.5 animate-pulse rounded-full bg-surface/80 ${w === 92 ? "w-[92%]" : w === 80 ? "w-4/5" : w === 86 ? "w-[86%]" : "w-3/5"}`} />
                      ))}
                    </div>
                  ) : current ? (
                    <>
                      {stale && <p className="mb-3 rounded-[var(--radius-btn)] bg-surface/70 px-3 py-2 text-[13px] text-ink-2">بعد از این تحلیل، وعده‌های روز تغییر کرده‌اند. برای تحلیل تازه «به‌روزرسانی» را بزن.</p>}
                      <AnalysisBody analysis={current.analysis} />
                    </>
                  ) : (
                    <div className="grid gap-3">
                      <p className="text-[15px] leading-7">{isLive ? "تحلیل این روز هر شب ساعت ۲۱:۳۰ خودکار نوشته می‌شود. اگر الان می‌خواهی، همین حالا بنویسمش." : "تحلیل از روی همین اعداد نوشته می‌شود؛ عددی از خودش نمی‌سازد."}</p>
                      <button type="button" onClick={generate} className="h-11 rounded-[var(--radius-btn)] bg-purple-ink text-[15px] font-semibold text-surface">
                        نوشتن تحلیل
                      </button>
                    </div>
                  )}
                  {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
                </div>
              </section>

              {current && !pending && <Summary analysis={current.analysis} />}
            </>
          )}
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 bg-surface pb-[env(safe-area-inset-bottom)]">
        <BottomNav active="/report" />
      </div>
    </div>
  );
}
