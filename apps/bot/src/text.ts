import { toPersianDigits, type DayView, type DraftView, type Goals, type MealType } from "@nutivo/core";

/** Message copy for the bot. Telegram HTML parse mode; every user-supplied string goes through esc(). */

export const MEAL: Record<MealType, string> = { breakfast: "صبحانه", lunch: "ناهار", snack: "میان‌وعده", dinner: "شام" };

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const intFmt = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
export const n = (x: number) => intFmt.format(Math.round(x));
const qtyFmt = (q: number) => toPersianDigits(String(+q.toFixed(2))).replace(".", "٫");

/** Short dish name: «جوجه‌کباب (سینه، پخته)» → «جوجه‌کباب». */
export const short = (name: string) => name.replace(/\s*\(.*?\)/g, "").trim();

/** 10-cell text bar; filled cells use the brand's green circle-free block so it reads in any Telegram theme. */
export function bar(ratio: number, cells = 10): string {
  const filled = Math.max(0, Math.min(cells, Math.round(ratio * cells)));
  return "▰".repeat(filled) + "▱".repeat(cells - filled);
}

export function draftCard(v: DraftView): string {
  const lines = [`<b>تأیید ${MEAL[v.meal_type]}</b>${v.from_photo ? " · از روی عکس" : ""}`, ""];
  v.items.forEach((it, i) => {
    const name = esc(short(it.food ?? it.said));
    const amount = it.unit === "گرم" ? `${n(it.grams ?? it.qty)} گرم` : `${qtyFmt(it.qty)} ${esc(it.unit)}${it.grams ? ` (${it.estimated ? "≈ " : ""}${n(it.grams)} گرم)` : ""}`;
    const kcal = it.kcal != null ? `<b>${it.estimated ? "≈" : ""}${n(it.kcal)}</b> کالری` : it.food ? "وزن؟" : "پیدا نشد";
    lines.push(`${toPersianDigits(String(i + 1))}. ${name} · ${amount} · ${kcal}`);
    if (!it.food) lines.push(`   <i>«${esc(it.said)}» را در فهرست غذاها پیدا نکردم؛ حذفش کن یا دوباره بنویس.</i>`);
  });
  lines.push("", `جمع: <b>${v.estimated ? "≈ " : ""}${n(v.totals.kcal)}</b> کالری · پروتئین ${n(v.totals.protein_g)} · کربو ${n(v.totals.carbs_g)} · چربی ${n(v.totals.fat_g)}`);
  if (v.question) lines.push("", `<i>${esc(v.question)}</i>`);
  if (!v.ready) lines.push("", "برای آیتمی که «وزن؟» دارد روی اسمش بزن و وزن را به گرم بفرست.");
  return lines.join("\n");
}

export function dayCard(d: DayView, title = d.date === d.today ? "امروز" : d.date): string {
  const pct = d.goals.kcal > 0 ? d.totals.kcal / d.goals.kcal : 0;
  const lines = [
    `<b>${esc(title)}</b> · ${n(d.totals.kcal)} از ${n(d.goals.kcal)} کالری`,
    `${bar(pct)} ${n(pct * 100)}٪`,
    `پروتئین ${n(d.totals.protein_g)}/${n(d.goals.protein_g)} · کربو ${n(d.totals.carbs_g)}/${n(d.goals.carbs_g)} · چربی ${n(d.totals.fat_g)}/${n(d.goals.fat_g)}`,
  ];
  lines.push(
    d.remaining.kcal >= 0
      ? `${n(d.remaining.kcal)} کالری${d.remaining.protein_g > 0 ? ` و ${n(d.remaining.protein_g)} گرم پروتئین` : ""} مانده.`
      : `${n(-d.remaining.kcal)} کالری بیشتر از هدف؛ روند هفته مهم‌تر از یک روز است.`,
  );
  if (d.meals.length) lines.push("", ...d.meals.map((m) => `${MEAL[m.meal_type]}: ${n(m.kcal)} کالری · ${m.items.map((i) => esc(short(i.name))).join("، ")}`));
  else lines.push("", "هنوز چیزی ثبت نشده. بنویس چی خوردی یا عکس بفرست.");
  if (d.streak > 1) lines.push("", `زنجیره: ${n(d.streak)} روز پشت‌سرهم${d.complete ? " · امروز روز کامل است" : ""}`);
  return lines.join("\n");
}

/** Caption under the day card image: the one line that matters plus what is left. */
export function dayCaption(d: DayView): string {
  const left = d.remaining.kcal >= 0 ? `${n(d.remaining.kcal)} کالری${d.remaining.protein_g > 0 ? ` و ${n(d.remaining.protein_g)} گرم پروتئین` : ""} مانده` : `${n(-d.remaining.kcal)} کالری بیشتر از هدف`;
  return `<b>${d.date === d.today ? "امروز" : esc(d.date)}</b>: ${n(d.totals.kcal)} از ${n(d.goals.kcal)} کالری، ${left}.${d.meals.length ? "" : "\nبنویس چی خوردی یا عکس بفرست."}`;
}

export function goalsCard(g: Goals): string {
  return [
    "<b>هدف‌های روزانه‌ات آماده است</b>",
    `کالری: <b>${n(g.kcal)}</b>`,
    `پروتئین: ${n(g.protein_g)} گرم · کربوهیدرات: ${n(g.carbs_g)} گرم · چربی: ${n(g.fat_g)} گرم`,
    "",
    "از همین حالا هر چی خوردی را بنویس، مثلاً «ناهار دو کفگیر برنج و یه سیخ جوجه»، یا از غذایت عکس بفرست.",
  ].join("\n");
}

export const COPY = {
  welcome: (name?: string) =>
    `سلام${name ? ` ${esc(name)}` : ""}! من نوتی‌ام، دستیار تغذیه Nutivo.\nهر چی می‌خوری بنویس یا عکسش را بفرست؛ کالری و پروتئینش را با دیتابیس غذای ایرانی حساب می‌کنم و شب گزارش روزت را می‌فرستم.\n\nاول چند سؤال کوتاه تا هدف‌هایت را حساب کنم.`,
  welcomeBack: "خوش برگشتی! بنویس چی خوردی یا عکس بفرست.",
  reading: "دارم می‌خونم… یه لحظه",
  readingPhoto: "دارم عکس را نگاه می‌کنم… یه لحظه",
  needStart: "اول /start را بزن تا آشنا شویم.",
  help: [
    "<b>راهنما</b>",
    "• بنویس چی خوردی: «صبحانه نون و پنیر و دو تا گردو»",
    "• یا از غذایت عکس بفرست",
    "• /today کارت امروز",
    "• /report گزارش امروز (شب‌ها خودم می‌فرستم)",
    "• /link کد ـ وصل‌کردن به حساب وب",
    "",
    "هیچ وعده‌ای بدون تأیید خودت حساب نمی‌شود.",
  ].join("\n"),
  saved: (meal: MealType, kcal: number) => `ثبت شد: ${MEAL[meal]} · ${n(kcal)} کالری`,
  cancelled: "باشه، ثبت نشد.",
  undone: "برگشت. این وعده حذف شد.",
  gramsAsk: (name: string) => `وزن «${esc(short(name))}» چند گرم بود؟ فقط عدد بفرست، مثلاً ۱۲۰.`,
  gramsBad: "یک عدد بین ۱ تا ۲۰۰۰ بفرست.",
};
