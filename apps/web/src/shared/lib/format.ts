const intFmt = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

/** Rounded integer with Persian digits and thousands separator: 1900 → «۱٬۹۰۰». */
export function faInt(n: number): string {
  return intFmt.format(Math.round(n));
}

const dayFmt = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { weekday: "long", day: "numeric", month: "long" });
const shortDayFmt = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { weekday: "narrow" });

/** «سه‌شنبه ۲۰ اکتبر» — Gregorian calendar, Persian digits and month names. */
export function faDayLabel(isoDate: string): string {
  return dayFmt.format(new Date(`${isoDate}T12:00:00`));
}

export function faWeekdayInitial(isoDate: string): string {
  return shortDayFmt.format(new Date(`${isoDate}T12:00:00`));
}

export function addDays(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
