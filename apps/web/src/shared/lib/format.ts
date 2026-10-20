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

const dtFmt = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const rtf = new Intl.RelativeTimeFormat("fa", { numeric: "auto" });

/** «۲۰ اکتبر ۲۰۲۶، ۱۳:۰۵» */
export function faDateTime(iso: string | null | undefined): string {
  return iso ? dtFmt.format(new Date(iso)) : "—";
}

/** «۳ ساعت پیش» relative to now. */
export function faAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(s, "second");
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return dtFmt.format(new Date(iso));
}

const fullFmt = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** «سه‌شنبه ۲۰ اکتبر ۲۰۲۶» */
export function faFullDate(isoDate: string): string {
  return fullFmt.format(new Date(`${isoDate}T12:00:00`));
}

/** 0.234 → «۲۳٪» */
export function faPct(ratio: number): string {
  return `${faInt(ratio * 100)}٪`;
}

/** «امروز» / «دیروز» / weekday name, for referring to a day in prose. */
export function faDayWord(date: string, today: string): string {
  if (date === today) return "امروز";
  if (date === addDays(today, -1)) return "دیروز";
  return new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { weekday: "long" }).format(new Date(`${date}T12:00:00`));
}
