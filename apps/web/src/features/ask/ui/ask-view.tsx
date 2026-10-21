"use client";
import { ASK_STARTERS, macrosForGrams, mealSlot, suggestRepeats, type MealType } from "@nutivo/core";
import { Check, SendHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import type { LoggedItem } from "@/entities/day/sample";
import { confirmMealAction } from "@/features/log-meal/api/actions";
import { localISO } from "@/features/log-meal/model/photo";
import { browserToday, isLocalSeeded, loadLocalAll, saveLocalDay, seedLocalSample } from "@/features/local-store/day-store";
import { useNutiEnabled } from "@/features/mascot/model/enabled";
import { Nuti } from "@/features/mascot/ui/nuti";
import { BottomNav } from "@/features/today/ui/bottom-nav";
import { MEAL_LABEL } from "@/features/today/ui/meal-list";
import { faInt } from "@/shared/lib/format";
import { FoodIconTile } from "@/shared/ui/food-icon";
import { askAction, type AskOption } from "../api/actions";

type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "nuti"; text: string; options: AskOption[]; slot?: MealType; remaining?: { kcal: number; protein_g: number } };

let seq = 1;

/** Review mode: today's items and usual meals from this browser. */
function localContext() {
  const t = browserToday();
  if (!isLocalSeeded()) seedLocalSample(t);
  const all = loadLocalAll();
  const items = all.days[t] ?? [];
  const usual = suggestRepeats({ history: all.days, today: t, hour: new Date().getHours(), limit: 8 }).map((r) => ({
    id: r.id,
    name: [...new Set(r.items.map((i) => i.food.name_fa.replace(/\s*\(.*?\)/g, "").trim()))].slice(0, 3).join(" و "),
    meal_type: r.meal_type,
    items: r.items.map((i) => ({ food_id: i.food.id, qty: i.qty, unit: i.unit, grams: i.grams })),
  }));
  return { today: t, goals: all.goals, eaten: items.map((i) => ({ food_id: i.food.id, grams: i.grams })), usual };
}

export function AskView({ mode }: { mode: "local" | "live" | "sample" }) {
  const [nutiOn] = useNutiEnabled();
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: "nuti", text: "سلام! بپرس چی بخوری؛ از روی امروزت یه چیز خوب برات پیدا می‌کنم.", options: [] }]);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [logged, setLogged] = useState<Record<string, "saving" | "done" | string>>({});
  const [hour, setHour] = useState(19);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHour(new Date().getHours());
  }, []);
  useEffect(() => {
    void endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, pending]);

  function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    if (mode === "sample") {
      setMsgs((m) => [...m, { id: seq++, role: "user", text: q }, { id: seq++, role: "nuti", text: "تو حالت نمونه نمی‌تونم حساب کنم. وارد حساب شو!", options: [] }]);
      return;
    }
    setText("");
    setMsgs((m) => [...m, { id: seq++, role: "user", text: q }]);
    start(async () => {
      const ctx = mode === "local" ? localContext() : null;
      const res = await askAction({
        question: q,
        hour: new Date().getHours(),
        local: ctx?.goals ? { goals: ctx.goals, eaten: ctx.eaten, usual: ctx.usual } : undefined,
      });
      setMsgs((m) => [
        ...m,
        res.ok
          ? { id: seq++, role: "nuti", text: res.reply, options: res.options, slot: res.slot, remaining: res.remaining }
          : { id: seq++, role: "nuti", text: res.error, options: [] },
      ]);
    });
  }

  async function ate(msgId: number, o: AskOption, slot: MealType) {
    const key = `${msgId}:${o.id}`;
    setLogged((l) => ({ ...l, [key]: "saving" }));
    if (mode === "local") {
      const t = browserToday();
      const all = loadLocalAll();
      const stamp = Date.now().toString(36);
      const added: LoggedItem[] = o.items.map((i, n) => ({
        key: `a-${stamp}-${n}`,
        meal_type: slot,
        name_raw: i.food.name_fa,
        qty: i.qty,
        unit: i.unit,
        prep_hint: undefined,
        confidence: "high",
        needs_question: undefined,
        from_photo: false,
        food: i.food,
        grams: i.grams,
        macros: macrosForGrams(i.food, i.grams),
        is_estimated: false,
        resolution: "default_unit",
      }));
      saveLocalDay(t, [...(all.days[t] ?? []), ...added]);
      setLogged((l) => ({ ...l, [key]: "done" }));
      return;
    }
    const res = await confirmMealAction({
      meal_type: slot,
      raw_input: o.name,
      input_channel: "web_quick",
      photo_path: null,
      eaten_at: localISO(),
      items: o.items.map((i) => ({ food_id: i.food.id, name_raw: i.food.name_fa, qty: i.qty, unit: i.unit, grams: i.grams, is_estimated: false, confidence: "high" })),
    });
    setLogged((l) => ({ ...l, [key]: res.ok ? "done" : res.error }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    ask(text);
  }

  const slotNow = mealSlot(hour);

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[max(20px,env(safe-area-inset-top))] pb-48">
        <header className="flex items-center gap-3">
          {nutiOn && <Nuti mood={pending ? "think" : "happy"} size={52} label="" />}
          <div>
            <h1 className="text-2xl font-bold">بپرس</h1>
            <p className="text-[13px] text-ink-2">{nutiOn ? "نوتی از روی امروزت پیشنهاد می‌ده" : "پیشنهاد بر اساس باقی‌مانده امروز"}</p>
          </div>
        </header>

        <ol className="mt-5 grid gap-3" aria-live="polite">
          {msgs.map((m) =>
            m.role === "user" ? (
              <li key={m.id} className="animate-rise flex justify-end">
                <p className="max-w-[80%] rounded-[18px] rounded-ee-[6px] bg-green-ink px-3.5 py-2 text-[15px] leading-7 text-surface">{m.text}</p>
              </li>
            ) : (
              <li key={m.id} className="animate-rise grid gap-2.5">
                <div className="flex items-end gap-2">
                  {nutiOn && <Nuti mood={m.options.length ? "wink" : "happy"} size={34} label="" className="shrink-0" />}
                  <p className="max-w-[85%] rounded-[18px] rounded-es-[6px] bg-purple-tint px-3.5 py-2 text-[15px] leading-7">{m.text}</p>
                </div>
                {m.remaining && m.options.length > 0 && (
                  <p className="tabular ms-11 text-xs text-ink-2">
                    {m.slot && <>برای {MEAL_LABEL[m.slot]} · </>}
                    {m.remaining.kcal > 0 ? `${faInt(m.remaining.kcal)} کالری` : "کالری امروز کامل است"}
                    {m.remaining.protein_g > 0 && ` · ${faInt(m.remaining.protein_g)} گرم پروتئین مانده`}
                  </p>
                )}
                {m.options.length > 0 && (
                  <ul className="grid gap-2">
                    {m.options.map((o) => {
                      const key = `${m.id}:${o.id}`;
                      const state = logged[key];
                      const main = [...o.items].sort((a, b) => macrosForGrams(b.food, b.grams).kcal - macrosForGrams(a.food, a.grams).kcal)[0]!;
                      return (
                        <li key={o.id} className="animate-rise rounded-[var(--radius-card)] border border-line bg-surface p-3 shadow-[var(--shadow-soft)]">
                          <div className="flex items-start gap-3">
                            <FoodIconTile food={main.food} size="md" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] font-semibold">{o.name}</p>
                              <p className="mt-0.5 text-xs leading-5 text-ink-2">{o.items.map((it) => `${faInt(it.qty)} ${it.unit === "گرم" ? "گرم" : it.unit} ${it.food.name_fa.replace(/\s*\(.*\)/, "")}`).join("، ")}</p>
                            </div>
                            <div className="tabular shrink-0 text-left">
                              <p className="text-base font-bold">{faInt(o.macros.kcal)}<span className="ms-0.5 text-[11px] font-normal text-ink-2">کالری</span></p>
                              <p className="text-[13px] font-semibold text-purple-ink">{faInt(o.macros.protein_g)}<span className="ms-0.5 text-[11px] font-normal">گرم پ</span></p>
                            </div>
                          </div>
                          {o.reason && <p className="mt-2 text-[13px] leading-6 text-purple-ink">{o.reason}</p>}
                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            {o.source === "history" ? <span className="rounded-full bg-track px-2 py-0.5 text-[11px] text-ink-2">از وعده‌های خودت</span> : <span />}
                            {state === "done" ? (
                              <span className="flex items-center gap-2 text-[13px]">
                                <span className="animate-pop flex items-center gap-1 font-semibold text-green-ink"><Check size={16} strokeWidth={2.5} aria-hidden />ثبت شد</span>
                                <Link href="/today" className="text-ink-2 underline underline-offset-4">دیدن امروز</Link>
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={state === "saving" || !m.slot}
                                onClick={() => m.slot && void ate(m.id, o, m.slot)}
                                className="h-9 rounded-[var(--radius-btn)] border border-green-ink px-3 text-[13px] font-semibold text-green-ink transition-colors duration-150 hover:bg-mint disabled:opacity-50"
                              >
                                {state === "saving" ? "در حال ثبت…" : "همین را خوردم"}
                              </button>
                            )}
                          </div>
                          {state && state !== "done" && state !== "saving" && <p role="alert" className="mt-1 text-xs text-error">{state}</p>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ),
          )}
          {pending && (
            <li className="flex items-end gap-2" aria-label="نوتی دارد فکر می‌کند">
              {nutiOn && <Nuti mood="think" size={34} label="" />}
              <span className="flex gap-1 rounded-[18px] rounded-es-[6px] bg-purple-tint px-4 py-3.5">
                {[0, 1, 2].map((d) => (
                  <span key={d} className={`size-1.5 animate-pulse rounded-full bg-purple ${d === 1 ? "[animation-delay:150ms]" : d === 2 ? "[animation-delay:300ms]" : ""}`} />
                ))}
              </span>
            </li>
          )}
        </ol>
        <div ref={endRef} />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10">
        <div className="mx-auto grid max-w-md gap-2 border-t border-line/60 bg-ground/95 px-4 pt-2.5 pb-3 backdrop-blur-sm">
          <div className="flex gap-2 overflow-x-auto pb-0.5" role="group" aria-label="پیشنهاد سؤال">
            {ASK_STARTERS[slotNow].map((s) => (
              <button key={s} type="button" disabled={pending} onClick={() => ask(s)} className="shrink-0 rounded-full border border-purple/30 bg-purple-tint px-3 py-1.5 text-[13px] font-medium text-purple-ink disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="flex items-center gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-1.5 shadow-[var(--shadow-soft)] focus-within:border-purple">
            <label htmlFor="ask-text" className="sr-only">سؤال</label>
            <input id="ask-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="مثلاً: شام چی بخورم که گوشت نداشته باشه؟" maxLength={300} autoComplete="off" className="min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none" />
            <button type="submit" disabled={!text.trim() || pending} aria-label="بپرس" className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-btn)] bg-purple-ink text-surface disabled:opacity-40">
              <SendHorizontal size={20} strokeWidth={2} className="-scale-x-100" aria-hidden />
            </button>
          </form>
        </div>
        <div className="bg-surface pb-[env(safe-area-inset-bottom)]">
          <BottomNav active="/ask" />
        </div>
      </div>
    </div>
  );
}
