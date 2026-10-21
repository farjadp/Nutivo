/** Jalali dates for ناخنک's truces (Nowruz, Yalda). Arithmetic conversion, good for 1300–1500 AP. */

export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const daysBefore = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  const y = gy - (gy <= 1600 ? 621 : 1600);
  const gy2 = gm > 2 ? y + 1 : y;
  let days =
    365 * y + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + daysBefore[gm - 1]!;
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

export type Holiday = "nowruz" | "yalda";

/** isoDate is the user's local date, "YYYY-MM-DD". */
export function holidayOn(isoDate: string): Holiday | null {
  const [gy, gm, gd] = isoDate.split("-").map(Number) as [number, number, number];
  const [, jm, jd] = toJalali(gy, gm, gd);
  if (jm === 1 && jd <= 4) return "nowruz";
  if (jm === 9 && jd === 30) return "yalda";
  return null;
}
