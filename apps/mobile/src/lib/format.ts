// Same formats as apps/web/src/shared/lib/format.ts: Gregorian calendar, Persian digits and month names.
const intFmt = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const dayFmt = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { weekday: "long", day: "numeric", month: "long" });
const weekdayFmt = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { weekday: "long" });
const narrowFmt = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { weekday: "narrow" });

const noon = (isoDate: string) => new Date(`${isoDate}T12:00:00`);

/** 1900 → «۱٬۹۰۰». Hermes uses a Latin comma for fa-IR, so swap in the Persian separator. */
export const faInt = (n: number) => intFmt.format(Math.round(n)).replace(/,/g, "٬");

/** «سه‌شنبه ۲۰ اکتبر» */
export const faDayLabel = (isoDate: string) => dayFmt.format(noon(isoDate));

export const faWeekdayInitial = (isoDate: string) => narrowFmt.format(noon(isoDate));

export const faDayNumber = (isoDate: string) => faInt(Number(isoDate.slice(8, 10)));

export function addDays(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** «امروز» / «دیروز» / weekday name. */
export function faDayWord(date: string, today: string): string {
  if (date === today) return "امروز";
  if (date === addDays(today, -1)) return "دیروز";
  return weekdayFmt.format(noon(date));
}

/** This moment's clock time on another calendar day, as an ISO string with the device offset (logging to a past day). */
export function atTimeOn(isoDate: string, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const off = -now.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const tz = `${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
  return `${isoDate}T${pad(now.getHours())}:${pad(now.getMinutes())}:00${tz}`;
}

/** Today's date on this device (not UTC). */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
