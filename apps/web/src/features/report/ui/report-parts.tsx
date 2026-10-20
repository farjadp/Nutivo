"use client";
import type { MealSection, ReportAnalysis, ReportFacts } from "@nutivo/core";
import { CircleAlert, CircleCheck, Flame, Lightbulb, Target, ThumbsUp } from "lucide-react";
import { MEAL_LABEL } from "@/features/today/ui/meal-list";
import { useTween } from "@/features/today/model/use-tween";
import { faInt, faPct } from "@/shared/lib/format";
import { FoodIconTile } from "@/shared/ui/food-icon";

const card = "rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)]";

export function SectionTitle({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold">
      <span className="tabular grid size-6 place-items-center rounded-full bg-mint text-[12px] font-bold text-green-ink">{n}</span>
      {children}
    </h2>
  );
}

/** Section 1: calories against the ±10% target band. Over is a soft amber, never red. */
export function KcalSection({ facts, estimated }: { facts: ReportFacts; estimated: number }) {
  const k = facts.kcal;
  const max = Math.max(k.high * 1.15, k.consumed);
  const w = useTween(k.consumed / max, { duration: 900, delay: 120 });
  const over = k.status === "over";
  return (
    <section aria-labelledby="r-kcal" className={card}>
      <SectionTitle n="۱"><span id="r-kcal">مجموع کالری</span></SectionTitle>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="tabular">
          <span className="text-4xl font-bold">{estimated > 0 && "≈"}{faInt(k.consumed)}</span>
          <span className="ms-1 text-sm text-ink-2">کیلوکالری</span>
        </p>
        <p className={`tabular rounded-full px-2.5 py-1 text-[13px] font-semibold ${k.status === "in_range" ? "bg-mint text-green-ink" : over ? "bg-[color-mix(in_srgb,var(--fat)_14%,transparent)] text-fat-ink" : "bg-track text-ink-2"}`}>
          {k.status === "in_range" ? "در محدوده" : k.status === "under" ? "زیر محدوده" : "بالای محدوده"}
        </p>
      </div>
      {/* RTL: drawn left-to-right then mirrored so progress grows from the right. */}
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="mt-4 block h-3 w-full -scale-x-100 overflow-hidden rounded-full" aria-hidden>
        <rect x="0" y="0" width="100" height="10" className="fill-track" />
        <rect x={(k.low / max) * 100} y="0" width={((k.high - k.low) / max) * 100} height="10" className="fill-mint" />
        <rect x="0" y="0" width={Math.max(0, w * 100)} height="10" rx="5" className={over ? "fill-fat" : "fill-green"} />
        <line x1={(k.goal / max) * 100} x2={(k.goal / max) * 100} y1="0" y2="10" className="stroke-ink" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <dl className="tabular mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div><dt className="text-ink-2">هدف</dt><dd className="text-sm font-semibold">{faInt(k.goal)}</dd></div>
        <div><dt className="text-ink-2">محدوده مناسب</dt><dd className="text-sm font-semibold">{faInt(k.low)} تا {faInt(k.high)}</dd></div>
        <div><dt className="text-ink-2">{k.diff <= 0 ? "باقی‌مانده" : "مازاد"}</dt><dd className="text-sm font-semibold">{faInt(Math.abs(k.diff))}</dd></div>
      </dl>
    </section>
  );
}

/** Section 3: every confirmed food, grouped by meal, with a totals row. */
export function FoodTable({ meals, totals, partial }: { meals: MealSection[]; totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }; partial: boolean }) {
  const num = "tabular px-1 py-2 text-left";
  return (
    <section aria-labelledby="r-table" className={`${card} px-0`}>
      <div className="px-4"><SectionTitle n="۳"><span id="r-table">خوراکی‌های روز</span></SectionTitle></div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11px] text-ink-2">
              <th scope="col" className="px-1.5 py-2 ps-4 text-start font-medium">خوراکی</th>
              <th scope="col" className="px-1.5 py-2 text-start font-medium">مقدار</th>
              <th scope="col" className="px-1 py-2 text-left font-medium">کالری</th>
              <th scope="col" className="px-1 py-2 text-left font-medium text-purple-ink">پروتئین</th>
              <th scope="col" className="px-1 py-2 text-left font-medium text-carbs">کربو</th>
              <th scope="col" className="px-1.5 py-2 pe-4 text-left font-medium text-fat-ink">چربی</th>
            </tr>
          </thead>
          {meals.map((m) => (
            <tbody key={m.meal_type}>
              <tr className="bg-ground">
                <th scope="rowgroup" colSpan={2} className="px-1.5 py-1.5 ps-4 text-start text-[12px] font-semibold text-ink-2">{MEAL_LABEL[m.meal_type]}</th>
                <td className={`${num} text-[12px] font-semibold text-ink-2`}>{faInt(m.macros.kcal)}</td>
                <td colSpan={3} />
              </tr>
              {m.items.map((it, i) => (
                <tr key={`${it.food.id}-${i}`} className="border-b border-line/60 last:border-0">
                  <td className="px-1.5 py-2 ps-4">
                    <span className="flex items-center gap-2">
                      <span className="hidden sm:contents"><FoodIconTile food={it.food} size="sm" estimated={it.is_estimated} /></span>
                      <span className="line-clamp-2 max-w-[8rem] leading-5">{it.food.name_fa}</span>
                    </span>
                  </td>
                  <td className="tabular px-1.5 py-2 whitespace-nowrap text-ink-2">
                    {it.unit === "گرم" ? `${faInt(it.grams)} گرم` : `${faInt(it.qty)} ${it.unit}`}
                    {it.unit !== "گرم" && <span className="block text-[11px]">{it.is_estimated && "≈ "}{faInt(it.grams)} گرم</span>}
                  </td>
                  <td className={`${num} font-semibold`}>{it.is_estimated && "≈"}{faInt(it.macros.kcal)}</td>
                  <td className={num}>{faInt(it.macros.protein_g)}</td>
                  <td className={num}>{faInt(it.macros.carbs_g)}</td>
                  <td className={`${num} pe-4`}>{faInt(it.macros.fat_g)}</td>
                </tr>
              ))}
            </tbody>
          ))}
          <tfoot>
            <tr className="border-t-2 border-ink/80 font-bold">
              <th scope="row" colSpan={2} className="px-1.5 py-2.5 ps-4 text-start">جمع{partial && <span className="ms-1 text-[11px] font-normal text-ink-2">(تخمینی)</span>}</th>
              <td className={num}>{faInt(totals.kcal)}</td>
              <td className={`${num} text-purple-ink`}>{faInt(totals.protein_g)}</td>
              <td className={`${num} text-carbs`}>{faInt(totals.carbs_g)}</td>
              <td className={`${num} pe-4 text-fat-ink`}>{faInt(totals.fat_g)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

/** Section 4a: the engine's own answers. Green check = met, amber = worth a look. */
export function DayChecks({ facts }: { facts: ReportFacts }) {
  const k = facts.kcal;
  const rows: { ok: boolean | null; title: string; detail: string }[] = [
    {
      ok: k.status === "in_range",
      title: k.status === "in_range" ? "کالری در محدوده هدف بود" : k.status === "under" ? "کالری کمتر از محدوده هدف بود" : "کالری بیشتر از محدوده هدف بود",
      detail: `${faInt(k.consumed)} از محدوده ${faInt(k.low)} تا ${faInt(k.high)}`,
    },
    {
      ok: facts.protein.enough,
      title: facts.protein.enough ? "پروتئین کافی بود" : "پروتئین کمتر از هدف بود",
      detail: `${faInt(facts.protein.consumed)} از ${faInt(facts.protein.goal)} گرم (${faPct(facts.protein.pct)})`,
    },
    {
      ok: facts.carbs.balanced && facts.fat.balanced,
      title: facts.carbs.balanced && facts.fat.balanced ? "کربوهیدرات و چربی متعادل بود" : "کربوهیدرات و چربی با هدف فاصله داشت",
      detail: `سهم انرژی: کربو ${faPct(facts.energy_split.carbs)}، چربی ${faPct(facts.energy_split.fat)}، پروتئین ${faPct(facts.energy_split.protein)}`,
    },
  ];
  return (
    <ul className="grid gap-2.5">
      {rows.map((r) => (
        <li key={r.title} className="flex items-start gap-2.5">
          {r.ok ? (
            <CircleCheck size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-success" aria-label="بله" />
          ) : (
            <CircleAlert size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-fat-ink" aria-label="نیاز به توجه" />
          )}
          <span>
            <span className="block text-[15px] font-medium">{r.title}</span>
            <span className="tabular block text-[13px] text-ink-2">{r.detail}</span>
          </span>
        </li>
      ))}
      {facts.heaviest_meal && (
        <li className="flex items-start gap-2.5">
          <Flame size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
          <span>
            <span className="block text-[15px] font-medium">پرکالری‌ترین وعده: {MEAL_LABEL[facts.heaviest_meal.meal_type]}</span>
            <span className="tabular block text-[13px] text-ink-2">{faInt(facts.heaviest_meal.kcal)} کالری، {faPct(facts.heaviest_meal.share)} کل روز</span>
          </span>
        </li>
      )}
      {(facts.top_kcal.length > 0 || facts.top_fat.length > 0) && (
        <li className="flex items-start gap-2.5">
          <Target size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
          <span className="text-[13px] leading-6 text-ink-2">
            <span className="block text-[15px] font-medium text-ink">بیشترین سهم در کالری و چربی</span>
            کالری: {facts.top_kcal.map((t) => `${t.name} (${faInt(t.kcal)})`).join("، ")}
            <br />
            چربی: {facts.top_fat.map((t) => `${t.name} (${faInt(t.fat_g)} گرم)`).join("، ") || "—"}
          </span>
        </li>
      )}
    </ul>
  );
}

/** Section 4b: Nutivo's written analysis (purple = Nutivo's voice). */
export function AnalysisBody({ analysis }: { analysis: ReportAnalysis }) {
  return (
    <div className="grid gap-4">
      {analysis.analysis.length > 0 && (
        <div className="grid gap-1.5">
          {analysis.analysis.map((t) => (
            <p key={t} className="animate-rise text-[15px] leading-7">{t}</p>
          ))}
        </div>
      )}
      {analysis.tomorrow.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-purple-ink">
            <Lightbulb size={16} strokeWidth={2} aria-hidden />
            برای فردا
          </h3>
          <ul className="mt-1.5 grid gap-1.5">
            {analysis.tomorrow.map((t) => (
              <li key={t} className="flex gap-2 text-[15px] leading-7">
                <span aria-hidden className="mt-3 size-1.5 shrink-0 rounded-full bg-purple" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Closing summary: one strength (green, the user's doing) and one priority (purple, Nutivo's read). */
export function Summary({ analysis }: { analysis: ReportAnalysis }) {
  if (!analysis.strength && !analysis.priority) return null;
  return (
    <section aria-labelledby="r-sum" className="grid gap-2">
      <h2 id="r-sum" className="text-base font-semibold">جمع‌بندی</h2>
      {analysis.strength && (
        <p className="flex gap-2.5 rounded-[var(--radius-card)] bg-mint p-3.5 text-[15px] leading-7">
          <ThumbsUp size={18} strokeWidth={2} className="mt-1 shrink-0 text-green-ink" aria-hidden />
          <span><span className="block text-xs font-semibold text-green-ink">نقطه قوت</span>{analysis.strength}</span>
        </p>
      )}
      {analysis.priority && (
        <p className="flex gap-2.5 rounded-[var(--radius-card)] bg-purple-tint p-3.5 text-[15px] leading-7">
          <Target size={18} strokeWidth={2} className="mt-1 shrink-0 text-purple-ink" aria-hidden />
          <span><span className="block text-xs font-semibold text-purple-ink">اولویت فردا</span>{analysis.priority}</span>
        </p>
      )}
    </section>
  );
}
