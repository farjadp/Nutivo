const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;
const PERSIAN_DIGIT_RE = /[۰-۹]/g; // U+06F0–U+06F9
const ARABIC_DIGIT_RE = /[٠-٩]/g; // U+0660–U+0669

/** Zero-width non-joiner (نیم‌فاصله). */
export const ZWNJ = "‌";
/** Persian decimal separator (ممیز). */
export const PERSIAN_DECIMAL = "٫";

/** Convert every Latin digit in a string (or a number) to Persian digits. */
export function toPersianDigits(value: string | number): string {
  const str = typeof value === "number" ? String(value) : value;
  return str.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)] as string);
}

/** Convert Persian (۰-۹) and Arabic-Indic (٠-٩) digits to Latin digits. */
export function toLatinDigits(str: string): string {
  return str
    .replace(PERSIAN_DIGIT_RE, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(ARABIC_DIGIT_RE, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Normalise Persian text for matching and storage:
 * Arabic yeh/kaf → Persian, digits → Latin, Arabic decimal separator → ".",
 * whitespace collapsed, trimmed. ZWNJ is preserved.
 */
export function normalizeFa(str: string): string {
  return toLatinDigits(str)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[٫،]/g, (c) => (c === "٫" ? "." : "،"))
    .replace(/\s+/g, " ")
    .trim();
}

/** Spoken forms people type → the written form food names use («نون» → «نان»). Whole words only. */
const COLLOQUIAL: Record<string, string> = {
  نون: "نان",
  چایی: "چای",
  ماس: "ماست",
  سیبزمینی: "سیب زمینی",
  تخممرغ: "تخم مرغ",
  ساندویج: "ساندویچ",
};

/** normalizeFa plus the spoken → written word swap, for food search only (never for stored text). */
export function searchFa(str: string): string {
  return normalizeFa(str)
    .split(" ")
    .map((w) => COLLOQUIAL[w] ?? w)
    .join(" ");
}

function formatNumberFa(n: number, decimals: number): string {
  const rounded = Number(n.toFixed(decimals));
  const [int, frac] = String(rounded).split(".");
  const intFa = toPersianDigits(int ?? "0");
  return frac ? `${intFa}${PERSIAN_DECIMAL}${toPersianDigits(frac)}` : intFa;
}

/** «۲۰۰ گرم» — grams to 1 decimal, trailing .0 dropped. */
export function formatGrams(n: number): string {
  return `${formatNumberFa(n, 1)} گرم`;
}

/** «۴۸۰ کیلوکالری» — integer kcal. */
export function formatKcal(n: number): string {
  return `${formatNumberFa(Math.round(n), 0)} کیلوکالری`;
}
