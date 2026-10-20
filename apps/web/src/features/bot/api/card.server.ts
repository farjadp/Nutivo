import "server-only";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { toPersianDigits, type DayView, type MealType } from "@nutivo/core";
import { NUTI_SVG } from "@/features/mascot/model/nuti-static";
import type { NutiMood } from "@/features/mascot/ui/nuti";

/**
 * The «امروز» card sent to Telegram: a 1080×1350 PNG in the brand's colours and type.
 * Built as SVG (numbers from the engine only), rendered with resvg so Persian shaping is correct.
 */

const C = {
  ground: "#FAF9F6",
  surface: "#FFFFFF",
  ink: "#20252B",
  ink2: "#667085",
  line: "#E5E7EB",
  track: "#EEF0F2",
  green: "#00A693",
  greenInk: "#007F71",
  mint: "#EAF8F5",
  purple: "#66023C",
  purpleTint: "#F5EAF0",
  carbs: "#2563EB",
  fat: "#D97706",
  fatInk: "#B45309",
};
const FONT = "IRANYekanXVFaNum";
const MEAL: Record<MealType, string> = { breakfast: "صبحانه", lunch: "ناهار", snack: "میان‌وعده", dinner: "شام" };

const fmt = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const n = (x: number) => fmt.format(Math.round(x));
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const short = (s: string) => s.replace(/\s*\(.*?\)/g, "").trim();

const dayFmt = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { weekday: "long", day: "numeric", month: "long" });

/**
 * resvg runs the bidi algorithm but takes the base direction from the first strong character,
 * so a line that starts with a number («۴۵ گرم مانده») comes out left-to-right.
 * A leading RIGHT-TO-LEFT MARK fixes the base direction for every line.
 */
const RLM = "\u200F";

/** One line of Persian text, right-aligned by default. */
function t(x: number, y: number, s: string, size: number, opts: { weight?: number; fill?: string; anchor?: "start" | "middle" | "end" } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${opts.weight ?? 400}" fill="${opts.fill ?? C.ink}" text-anchor="${opts.anchor ?? "end"}">${RLM}${xml(s)}</text>`;
}

function ring(cx: number, cy: number, r: number, w: number, ratio: number, color: string) {
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, ratio));
  // Starts at 12 o'clock and runs counter-clockwise, the reading direction of RTL.
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.track}" stroke-width="${w}"/>
  ${p > 0 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(circ * p).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy}) scale(1 -1) translate(0 ${-2 * cy})"/>` : ""}`;
}

function macroRow(y: number, label: string, consumed: number, goal: number, color: string, ink: string) {
  const W = 840, X = 120;
  const ratio = goal > 0 ? consumed / goal : 0;
  const fill = Math.max(0, Math.min(1, ratio / 1.25)) * W;
  const tick = W / 1.25;
  return `${t(960, y, label, 34, { weight: 700 })}
  ${t(120, y, `${n(consumed)} / ${n(goal)} گرم`, 30, { fill: C.ink2, anchor: "start" })}
  <rect x="${X}" y="${y + 22}" width="${W}" height="18" rx="9" fill="${C.track}"/>
  <rect x="${X + W - fill}" y="${y + 22}" width="${fill}" height="18" rx="9" fill="${color}"/>
  <rect x="${X + W - tick - 1.5}" y="${y + 14}" width="3" height="34" rx="1.5" fill="${C.ink}"/>
  ${t(960, y + 80, consumed <= goal ? `${n(goal - consumed)} گرم مانده` : `${n(consumed - goal)} گرم بیشتر از هدف`, 26, { fill: ink })}`;
}

export function dayCardSvg(day: DayView, opts: { name?: string } = {}): string {
  const W = 1080, H = 1440;
  const over = day.remaining.kcal < 0;
  const ratio = day.goals.kcal > 0 ? day.totals.kcal / day.goals.kcal : 0;
  const mood: NutiMood = day.complete ? "cheer" : day.meals.length === 0 ? "sleepy" : over ? "think" : "happy";
  const nuti = NUTI_SVG[mood].replace('width="120" height="120"', 'width="150" height="150"').replace("<svg ", '<svg x="70" y="40" ');
  const title = day.date === day.today ? "امروز" : dayFmt.format(new Date(`${day.date}T12:00:00`)).split(" ")[0]!;

  const meals = day.meals.slice(0, 4).map((m, i) => {
    const y = 1160 + i * 52;
    // A trailing «…» is a neutral character and lands on the wrong side in resvg; say «و بیشتر» instead.
    let shown = m.items.map((x) => short(x.name)).slice(0, 3);
    while (shown.length > 1 && shown.join("، ").length > 30) shown = shown.slice(0, -1);
    const names = shown.join("، ") + (shown.length < m.items.length ? " و بیشتر" : "");
    return `${t(960, y, MEAL[m.meal_type], 30, { weight: 700 })}${t(800, y, names, 28, { fill: C.ink2 })}${t(120, y, `${n(m.kcal)} کالری`, 28, { anchor: "start" })}`;
  });

  const pills: string[] = [];
  let px = 960;
  const pill = (label: string, bg: string, fg: string) => {
    const w = 26 + label.length * 19;
    pills.push(`<rect x="${px - w}" y="${H - 118}" width="${w}" height="56" rx="28" fill="${bg}"/>${t(px - 22, H - 80, label, 28, { weight: 700, fill: fg })}`);
    px -= w + 16;
  };
  if (day.streak > 1) pill(`${toPersianDigits(String(day.streak))} روز پشت‌سرهم`, C.mint, C.greenInk);
  if (day.complete) pill("روز کامل", C.greenInk, C.surface);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.ground}"/>
  ${t(1000, 110, title, 64, { weight: 900 })}
  ${t(1000, 160, dayFmt.format(new Date(`${day.date}T12:00:00`)), 30, { fill: C.ink2 })}
  ${nuti}
  <rect x="60" y="210" width="960" height="1110" rx="40" fill="${C.surface}" stroke="${C.line}" stroke-width="2"/>
  ${ring(540, 470, 200, 38, ratio, over ? C.fat : C.green)}
  ${t(540, 478, n(Math.abs(day.remaining.kcal)), 104, { weight: 900, anchor: "middle" })}
  ${t(540, 530, over ? "کالری بیشتر از هدف" : "کیلوکالری باقی‌مانده", 32, { fill: C.ink2, anchor: "middle" })}
  ${t(540, 578, `${n(day.totals.kcal)} از ${n(day.goals.kcal)}`, 28, { fill: C.ink2, anchor: "middle" })}
  ${macroRow(730, "پروتئین", day.totals.protein_g, day.goals.protein_g, C.purple, C.purple)}
  ${macroRow(860, "کربوهیدرات", day.totals.carbs_g, day.goals.carbs_g, C.carbs, C.carbs)}
  ${macroRow(990, "چربی", day.totals.fat_g, day.goals.fat_g, C.fat, C.fatInk)}
  <rect x="120" y="1100" width="840" height="2" fill="${C.line}"/>
  ${meals.length ? meals.join("") : t(540, 1200, "هنوز چیزی ثبت نشده", 32, { fill: C.ink2, anchor: "middle" })}
  ${pills.join("")}
  <text x="80" y="${H - 72}" font-family="${FONT}" font-size="34" font-weight="900" fill="${C.greenInk}" text-anchor="start">Nutivo</text>
  ${opts.name ? t(80 + 160, H - 72, "", 1) : ""}
</svg>`;
}

const fontDir = path.join(process.cwd(), "assets/fonts");
const FONT_FILES = ["Regular", "Bold", "Black"].map((w) => path.join(fontDir, `IRANYekanXFaNum-${w}.ttf`));

export function renderPng(svg: string): Buffer {
  const r = new Resvg(svg, { font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: FONT }, fitTo: { mode: "original" } });
  return Buffer.from(r.render().asPng());
}
