/**
 * Nutivo food icon set.
 *
 * Grid 24×24, 2px safe area, outline only, rendered with stroke 1.75, round caps and joins,
 * colour = currentColor (brand doc §10: Lucide-compatible outline icons, no 3D or cartoon).
 * Small filled dots are the only fills (seeds, crumbs, eyes).
 *
 * Pure data so web (React), the Telegram bot (SVG → PNG) and mobile (react-native-svg) share one set.
 */

export type IconEl =
  | { p: string }
  /** circle: cx, cy, r; f = filled dot */
  | { c: [number, number, number]; f?: true }
  /** ellipse: cx, cy, rx, ry, rotation° */
  | { e: [number, number, number, number, number?] }
  /** rect: x, y, w, h, rx */
  | { r: [number, number, number, number, number?] };

export interface FoodIconDef {
  /** Persian label for the icon sheet and accessibility. */
  fa: string;
  /** Rotate the whole drawing around the centre (degrees). */
  rot?: number;
  els: IconEl[];
}

const BOWL: IconEl[] = [{ p: "M3 12h18" }, { p: "M4 12c.4 4.6 3.7 8 8 8s7.6-3.4 8-8" }];
const STEAM: IconEl[] = [{ p: "M9.5 7.5c-.7-.9-.7-1.9 0-2.8" }, { p: "M14.5 7.5c-.7-.9-.7-1.9 0-2.8" }];
const dot = (cx: number, cy: number, r = 0.6): IconEl => ({ c: [cx, cy, r], f: true });

export const FOOD_ICONS = {
  // ── Iranian dishes and staples ────────────────────────────────────────────
  rice: {
    fa: "چلو",
    els: [
      { p: "M2.5 16.5h19" },
      { p: "M5 16.5c.4 1.9 1.9 3 3.8 3h6.4c1.9 0 3.4-1.1 3.8-3" },
      { p: "M5.5 16.5C5.5 11.8 8.4 8 12 8s6.5 3.8 6.5 8.5" },
      { p: "M9.3 9.4c1.7-.9 3.7-.9 5.4 0" },
      { p: "M9 13l.6.6" },
      { p: "M12 11.6v.9" },
      { p: "M14.7 13.3l.6-.6" },
      { p: "M11.2 14.6l.5.6" },
    ],
  },
  "rice-raw": {
    fa: "برنج خام",
    els: [
      { e: [8, 9, 1.7, 3.8, -30] },
      { e: [15.6, 8.4, 1.7, 3.8, 28] },
      { e: [12.2, 16, 1.7, 3.8, 82] },
      dot(18.5, 15, 0.7),
      dot(5.8, 16.2, 0.7),
    ],
  },
  "bread-sangak": {
    fa: "نان سنگک",
    els: [
      { p: "M3 8.5c2.6-1.6 15.4-1.6 18 0l-.8 8c-2.8 1.5-13.6 1.5-16.4 0z" },
      dot(7, 11.2), dot(10.5, 10.6), dot(14, 11), dot(17.2, 10.8),
      dot(8.8, 14), dot(12.3, 13.8), dot(15.8, 14.2),
    ],
  },
  "bread-barbari": {
    fa: "نان بربری",
    els: [
      { p: "M2.5 12c0-2.8 4.3-4.8 9.5-4.8s9.5 2 9.5 4.8-4.3 4.8-9.5 4.8S2.5 14.8 2.5 12z" },
      { p: "M7 9.7v4.6" },
      { p: "M10.3 9v6" },
      { p: "M13.7 9v6" },
      { p: "M17 9.7v4.6" },
    ],
  },
  "bread-lavash": {
    fa: "نان لواش",
    els: [
      { p: "M3.5 6.5h13l4 4v7h-17z" },
      { p: "M16.5 6.5v4h4" },
      { p: "M5.5 20h14.2" },
      dot(7.5, 10.5), dot(11, 13.2), dot(13.6, 9.8), dot(8.4, 14.6), dot(16.2, 14),
    ],
  },
  bread: {
    fa: "نان",
    els: [
      { p: "M5 10.5c-1.4-.4-2-1.4-2-2.6C3 5.7 6.6 4 12 4s9 1.7 9 3.9c0 1.2-.6 2.2-2 2.6V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" },
      { p: "M8.5 13.5l2.2-2.2" },
      { p: "M13.3 13.5l2.2-2.2" },
    ],
  },
  chicken: {
    fa: "مرغ گریل",
    els: [
      { p: "M14.8 14.6c-2.4 2.4-6.4 2.2-8.9-.3s-2.7-6.5-.3-8.9 6.5-2.2 8.9.3 2.7 6.5.3 8.9z" },
      { p: "M14.8 14.6l2.4 2.4" },
      { c: [19, 17.4, 1.5] },
      { c: [17.4, 19, 1.5] },
      { p: "M6.6 10.6l3.9-3.9" },
      { p: "M8.6 12.8l4.2-4.2" },
    ],
  },
  "chicken-fried": {
    fa: "مرغ سرخ‌شده",
    els: [
      { p: "M14.8 14.6c-2.4 2.4-6.4 2.2-8.9-.3s-2.7-6.5-.3-8.9 6.5-2.2 8.9.3 2.7 6.5.3 8.9z" },
      { p: "M14.8 14.6l2.4 2.4" },
      { c: [19, 17.4, 1.5] },
      { c: [17.4, 19, 1.5] },
      dot(7.6, 8.4), dot(10.6, 6.9), dot(8.2, 11.8), dot(11.9, 10.2), dot(13.4, 13), dot(10.4, 13.9),
    ],
  },
  meat: {
    fa: "گوشت",
    els: [
      { p: "M4.5 10.5C4.5 6.6 8 4 12.5 4S20 6.8 20 11c0 3.4-2 5.4-4.4 6.9-1.6 1-2.3 2.6-4.6 3-3.7.6-7.5-1.6-7.5-5.4 0-1.4.9-2.3.9-3.3 0-.6-.4-1.1-.4-1.7z" },
      { c: [14.2, 10.5, 2] },
      { p: "M7.5 14c1.2-.4 2.2.2 3 1" },
    ],
  },
  "stew-herb": {
    fa: "قورمه‌سبزی",
    els: [
      ...BOWL,
      { p: "M7.5 11c0-2.8 2-5 5-5 0 2.8-2 5-5 5z" },
      { p: "M7.5 11l3.4-3.4" },
      { e: [16.3, 10, 1.7, 1, -15] },
    ],
  },
  "stew-gheymeh": {
    fa: "قیمه",
    els: [...BOWL, { p: "M7.8 10V6.2" }, { p: "M10.6 10V4.8" }, { p: "M13.4 10V5.6" }, { p: "M16.2 10V7" }],
  },
  "kebab-koobideh": {
    fa: "کباب کوبیده",
    rot: -35,
    els: [
      { p: "M2 12h1.6" },
      { p: "M19.6 12H22" },
      { p: "M6 9.6h11.2a2.4 2.4 0 0 1 0 4.8H6a2.4 2.4 0 0 1 0-4.8z" },
      { p: "M9 9.6v1.1" }, { p: "M12 9.6v1.1" }, { p: "M15 9.6v1.1" },
      { p: "M9 14.4v-1.1" }, { p: "M12 14.4v-1.1" }, { p: "M15 14.4v-1.1" },
    ],
  },
  "kebab-joojeh": {
    fa: "جوجه‌کباب",
    rot: -35,
    els: [
      { p: "M2 12h2.3" },
      { p: "M19.7 12H22" },
      { r: [4.3, 9.3, 4.4, 5.4, 1.3] },
      { r: [9.8, 9.3, 4.4, 5.4, 1.3] },
      { r: [15.3, 9.3, 4.4, 5.4, 1.3] },
    ],
  },
  salad: {
    fa: "سالاد",
    els: [
      ...BOWL,
      { r: [6.4, 8.1, 2.6, 2.6, 0.6] },
      { r: [10.7, 6.6, 2.6, 2.6, 0.6] },
      { r: [14.6, 8.3, 2.6, 2.6, 0.6] },
      { p: "M17.6 9.4c.3-1.9 1.7-3.2 3.4-3.2-.3 1.9-1.7 3.2-3.4 3.2z" },
    ],
  },
  yogurt: {
    fa: "ماست",
    els: [
      { p: "M5 8h14" },
      { p: "M6.2 8l1 11.2a1.5 1.5 0 0 0 1.5 1.3h6.6a1.5 1.5 0 0 0 1.5-1.3l1-11.2" },
      { p: "M9 8c0-1.7 1.3-3 3-3s3 1.3 3 3" },
      { p: "M12 5c0-.8.4-1.5 1-2" },
    ],
  },
  doogh: {
    fa: "دوغ",
    els: [
      { p: "M6.8 4h10.4l-1.5 15.4a1.5 1.5 0 0 1-1.5 1.4H9.8a1.5 1.5 0 0 1-1.5-1.4z" },
      { p: "M7.4 9h9.2" },
      { c: [10.6, 13.2, 0.9] },
      { c: [13.2, 16, 0.7] },
      { c: [13.4, 11.7, 0.55] },
      { p: "M15.6 6.4c.4-1.8 1.8-2.9 3.6-2.9-.4 1.8-1.8 2.9-3.6 2.9z" },
    ],
  },
  cheese: {
    fa: "پنیر",
    els: [
      { p: "M3.5 9.6L12 5.5l8.5 4.1v6.7L12 20.5l-8.5-4.2z" },
      { p: "M3.5 9.6l8.5 4.2 8.5-4.2" },
      { p: "M12 13.8v6.7" },
      dot(10.2, 9.3), dot(13.6, 8.8), dot(12, 11),
    ],
  },
  egg: {
    fa: "تخم‌مرغ",
    els: [
      { p: "M12 3.5c3.4 0 6.5 5 6.5 9.6 0 4.2-2.9 7.4-6.5 7.4s-6.5-3.2-6.5-7.4c0-4.6 3.1-9.6 6.5-9.6z" },
      { p: "M9.2 10.4c.3-1.4 1-2.6 1.9-3.4" },
    ],
  },
  butter: {
    fa: "کره",
    els: [
      { p: "M3 14l9-4.5 9 4.5-9 4.5z" },
      { p: "M3 14v2.4l9 4.6 9-4.6V14" },
      { p: "M12 18.5V21" },
      { p: "M13.8 6c-1.9-.9-3.9.4-3.4 2.1.3 1 1.7 1.4 2.4.6" },
    ],
  },
  oil: {
    fa: "روغن",
    els: [
      { p: "M9.8 2.5h4.4" },
      { p: "M10.5 2.5v3L8 9v10.5A1.5 1.5 0 0 0 9.5 21h5a1.5 1.5 0 0 0 1.5-1.5V9l-2.5-3.5v-3" },
      { p: "M12 11.5c1 1.2 1.6 2.1 1.6 2.9a1.6 1.6 0 1 1-3.2 0c0-.8.6-1.7 1.6-2.9z" },
    ],
  },
  cucumber: {
    fa: "خیار",
    rot: -35,
    els: [{ r: [3, 9.2, 17, 5.6, 2.8] }, { p: "M20 12h1.5" }, dot(7.2, 11.2), dot(10.6, 12.9), dot(14, 11.2), dot(16.8, 12.8)],
  },
  tomato: {
    fa: "گوجه",
    els: [
      { p: "M12 7.2c4.4 0 8 2.9 8 6.7s-3.6 6.6-8 6.6-8-2.8-8-6.6 3.6-6.7 8-6.7z" },
      { p: "M12 7.2L9.8 5" }, { p: "M12 7.2L14.2 5" }, { p: "M12 7.2l-3.3.9" }, { p: "M12 7.2l3.3.9" },
      { p: "M12 7.2V3.5" },
    ],
  },
  lentil: {
    fa: "عدسی",
    els: [...BOWL, ...STEAM, dot(8, 10.6, 0.7), dot(11, 10, 0.7), dot(14, 10.4, 0.7), dot(16.6, 10.8, 0.7)],
  },
  ash: {
    fa: "آش",
    els: [
      ...BOWL,
      { p: "M6 10c1-1 2-1 3 0s2 1 3 0 2-1 3 0 2 1 3 0" },
      { p: "M9 7.2c1.8-1.2 4.2-1.2 6 0" },
      dot(12, 4.8, 0.7),
    ],
  },
  soup: { fa: "سوپ", els: [...BOWL, ...STEAM, { p: "M7 10h10" }] },
  dates: {
    fa: "خرما",
    els: [
      { e: [12, 13.2, 3.7, 6.4, -25] },
      { p: "M10.4 9.4c.9 2.3.9 5-.3 7.4" },
      { p: "M14.8 7.2l1.4-1.8" },
    ],
  },
  walnut: {
    fa: "گردو",
    els: [
      { p: "M12 3.5c4.6 0 8 3.6 8 8.5s-3.4 8.5-8 8.5-8-3.6-8-8.5 3.4-8.5 8-8.5z" },
      { p: "M12 3.5v17" },
      { p: "M8.2 8.4c1.2.4 1.4 1.6.6 2.3s-.6 2 .6 2.4" },
      { p: "M7.6 15.4c1 .3 1.6 1 1.6 1.8" },
      { p: "M15.8 8.4c-1.2.4-1.4 1.6-.6 2.3s.6 2-.6 2.4" },
      { p: "M16.4 15.4c-1 .3-1.6 1-1.6 1.8" },
    ],
  },
  nuts: {
    fa: "آجیل",
    els: [
      { e: [8.8, 10, 3, 4.6, -30] },
      { p: "M6.7 7l4.2 6" },
      { e: [15.4, 14, 3, 4.6, 22] },
      { p: "M14 10.2l2.8 7.6" },
      dot(18.4, 6.4, 0.9),
    ],
  },
  herbs: {
    fa: "سبزی",
    els: [
      { p: "M12 21v-8" },
      { p: "M12 15c-2-1-3.5-3-3.5-6" },
      { p: "M12 13c2-1 3.5-3 3.5-6" },
      { p: "M8.5 9c-2-.6-3.4-2.4-3.5-4.8 2.4.1 4 1.9 3.5 4.8z" },
      { p: "M15.5 7c2-.6 3.4-2.4 3.5-4.8-2.4.1-4 1.9-3.5 4.8z" },
      { p: "M12 13c-1.6-1.4-2-3.6-1-5.8 1.6 1.5 2 3.6 1 5.8z" },
      { p: "M10.4 17.5h3.2" },
    ],
  },
  fish: {
    fa: "ماهی",
    els: [
      { p: "M7 12c2-3.5 5.2-5.3 8.3-5.3 2.6 0 4.6 1.8 5.7 5.3-1.1 3.5-3.1 5.3-5.7 5.3-3.1 0-6.3-1.8-8.3-5.3z" },
      { p: "M7 12L3 8.5v7z" },
      dot(17.3, 11, 0.8),
    ],
  },
  potato: {
    fa: "سیب‌زمینی",
    els: [
      { p: "M6.5 6.8c2.6-2.5 8.4-2.9 11.4.2 2.8 2.9 2.4 7.6-.5 10.6-3 3.1-8.4 3.6-11.3.9-2.8-2.6-2.3-9.1.4-11.7z" },
      dot(9.5, 9.5), dot(14.5, 10.5), dot(11, 14.8),
    ],
  },
  pasta: {
    fa: "ماکارونی",
    els: [
      ...BOWL,
      { p: "M6.6 12c0-2.4 2.4-4.2 5.4-4.2s5.4 1.8 5.4 4.2" },
      { p: "M9 12c0-1.2 1.3-2.1 3-2.1s3 .9 3 2.1" },
      { p: "M17.5 2.5v3.6" }, { p: "M19.5 2.5v3.6" }, { p: "M17.5 6.1c0 1.2 2 1.2 2 0" }, { p: "M18.5 7v2.5" },
    ],
  },
  sandwich: {
    fa: "ساندویچ",
    els: [
      { p: "M4 9.5c0-2.5 3.6-4.5 8-4.5s8 2 8 4.5z" },
      { p: "M3.5 12.5c1.4 1 2.8-1 4.2 0s2.8 1 4.3 0 2.9-1 4.3 0 2.8 1 4.2 0" },
      { p: "M4 15.5h16" },
      { p: "M4 18h16v.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" },
    ],
  },
  pizza: {
    fa: "پیتزا",
    els: [
      { p: "M12 21.5L3.6 5.6c5.3-2.6 11.5-2.6 16.8 0z" },
      { p: "M4.7 7.7c4.6-2 10-2 14.6 0" },
      { c: [10, 10.6, 1.1] },
      { c: [14.2, 10.2, 0.9] },
      { c: [12, 14.6, 1] },
    ],
  },
  // ── Fruit ─────────────────────────────────────────────────────────────────
  apple: {
    fa: "سیب",
    els: [
      { p: "M12 8c-1.6-1-5.4-1.3-6.9 2-1.7 3.8.5 9.5 3.4 10.7 1.4.6 2.4-.3 3.5-.3s2.1.9 3.5.3c2.9-1.2 5.1-6.9 3.4-10.7-1.5-3.3-5.3-3-6.9-2z" },
      { p: "M12 8c0-1.7.5-3.1 1.6-4.2" },
      { p: "M13.6 5.3c1-1.4 2.6-1.8 3.9-1.3-.6 1.4-2.2 2-3.9 1.3z" },
    ],
  },
  banana: {
    fa: "موز",
    els: [
      { p: "M4.6 7c.4 7.3 5.4 12.1 13.8 11.6.9-.1 1.4-1 1-1.8-6.5.6-11-3.2-12.1-9.8z" },
      { p: "M4.6 7l-.4-2.2h2.8L7.3 7" },
      { p: "M9.3 11.6c1.7 2.3 4.1 3.7 7.2 4.1" },
    ],
  },
  orange: {
    fa: "پرتقال",
    els: [{ c: [12, 12, 8.5] }, { c: [12, 12, 6.2] }, { p: "M12 5.8v12.4" }, { p: "M5.8 12h12.4" }, { p: "M7.6 7.6l8.8 8.8" }, { p: "M16.4 7.6l-8.8 8.8" }],
  },
  grapes: {
    fa: "انگور",
    els: [
      { c: [8, 10, 2] }, { c: [12, 10, 2] }, { c: [16, 10, 2] },
      { c: [10, 13.8, 2] }, { c: [14, 13.8, 2] }, { c: [12, 17.6, 2] },
      { p: "M12 8V4" },
      { p: "M12 5.5c1.2-1.4 3-1.8 4.5-1.3-.7 1.4-2.6 2-4.5 1.3z" },
    ],
  },
  watermelon: {
    fa: "هندوانه",
    els: [{ p: "M2.5 9a9.5 9.5 0 0 0 19 0z" }, { p: "M5 9a7 7 0 0 0 14 0" }, dot(9, 12), dot(12, 13.8), dot(15, 12), dot(12, 10.8)],
  },
  pomegranate: {
    fa: "انار",
    els: [
      { p: "M12 6.8c4.4 0 8 3.3 8 7.5S16.4 21.5 12 21.5s-8-3.1-8-7.2 3.6-7.5 8-7.5z" },
      { p: "M9.4 7.2L9 3.8l1.8 1.4L12 3l1.2 2.2L15 3.8l-.4 3.4" },
      { p: "M8.4 13c.4-1.6 1.4-2.8 2.7-3.4" },
    ],
  },
  fruit: {
    fa: "میوه",
    els: [
      { c: [9, 14.5, 5] },
      { c: [16.5, 12.5, 3.5] },
      { p: "M9 9.5c0-2 .8-3.6 2.2-4.6" },
      { p: "M16.5 9V6.5" },
    ],
  },
  // ── Drinks ────────────────────────────────────────────────────────────────
  tea: {
    fa: "چای",
    els: [
      { p: "M4.5 19.5c0 .8 3.4 1.5 7.5 1.5s7.5-.7 7.5-1.5" },
      { p: "M7.5 5h9c0 3-1.8 4.4-1.8 6.5S17 15 16.5 18.2a1 1 0 0 1-1 .8h-7a1 1 0 0 1-1-.8C7 15 9.3 13.6 9.3 11.5S7.5 8 7.5 5z" },
      { p: "M8 7.8h8" },
      { p: "M10.5 3c-.4-.5-.4-1 0-1.5" },
      { p: "M13.5 3c-.4-.5-.4-1 0-1.5" },
    ],
  },
  coffee: {
    fa: "قهوه",
    els: [
      { p: "M4.5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" },
      { p: "M16.5 10.5h1.2a2.3 2.3 0 0 1 0 4.6h-1.4" },
      { p: "M3.5 21h15" },
      { p: "M8.5 6.5c-.6-.8-.6-1.6 0-2.4" },
      { p: "M12.5 6.5c-.6-.8-.6-1.6 0-2.4" },
    ],
  },
  water: {
    fa: "آب",
    els: [
      { p: "M6 4h12l-1.6 15.2a1.5 1.5 0 0 1-1.5 1.3H9.1a1.5 1.5 0 0 1-1.5-1.3z" },
      { p: "M6.6 9.5c1.8.8 3.6.8 5.4 0s3.6-.8 5.4 0" },
    ],
  },
  juice: {
    fa: "آبمیوه",
    els: [
      { p: "M6.5 8h11l-1.4 11.3a1.5 1.5 0 0 1-1.5 1.2H9.4a1.5 1.5 0 0 1-1.5-1.2z" },
      { p: "M12.5 8l1.8-5h2.6" },
      { p: "M7 12h10" },
    ],
  },
  milk: {
    fa: "شیر",
    els: [
      { p: "M7.5 8.5l2-4h5l2 4v11a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5z" },
      { p: "M9.5 4.5V3h5v1.5" },
      { p: "M7.5 8.5h9" },
      { p: "M12 12c1 1.2 1.6 2.1 1.6 2.9a1.6 1.6 0 1 1-3.2 0c0-.8.6-1.7 1.6-2.9z" },
    ],
  },
  // ── Snacks and sweets ─────────────────────────────────────────────────────
  cookie: {
    fa: "بیسکویت",
    els: [
      { p: "M20.5 12a8.5 8.5 0 1 1-8.9-8.5 2.6 2.6 0 0 0 3.4 3.4 2.6 2.6 0 0 0 5.5 5.1z" },
      dot(8.5, 9.5, 0.8), dot(12.5, 13.5, 0.8), dot(8.8, 15.2, 0.8), dot(15.5, 16, 0.8),
    ],
  },
  chips: {
    fa: "چیپس",
    els: [
      { p: "M6.5 4h11l-.8 2.2c1 4.4 1 7.2 0 11.6l.8 2.2h-11l.8-2.2c-1-4.4-1-7.2 0-11.6z" },
      { p: "M9.5 11.5c1.5-1.8 3.5-2 5-.5-.5 2.2-2.6 3.3-5 .5z" },
    ],
  },
  chocolate: {
    fa: "شکلات",
    els: [{ r: [5.5, 3, 13, 18, 1.5] }, { p: "M5.5 9h13" }, { p: "M5.5 15h13" }, { p: "M12 3v18" }],
  },
  cake: {
    fa: "شیرینی",
    els: [
      { p: "M4 11h16v8.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" },
      { p: "M4 14c1.3 1 2.7 1 4 0s2.7-1 4 0 2.7 1 4 0 2.7-1 4 0" },
      { p: "M12 11V8" },
      { p: "M12 3.8c.8.8 1 1.6.6 2.2h-1.2c-.4-.6-.2-1.4.6-2.2z" },
    ],
  },
  // ── Fallback ──────────────────────────────────────────────────────────────
  dish: {
    fa: "غذا",
    els: [
      { c: [12.5, 12, 6.3] },
      { c: [12.5, 12, 3.6] },
      { p: "M3 4v4.5a1.5 1.5 0 0 0 3 0V4" },
      { p: "M4.5 4v16" },
      { p: "M21.5 4c-1.4 1.2-2 3-2 5.5V13h2v7" },
    ],
  },
} satisfies Record<string, FoodIconDef>;

export type FoodIconName = keyof typeof FOOD_ICONS;
export const FOOD_ICON_NAMES = Object.keys(FOOD_ICONS) as FoodIconName[];

/** Exact icons for the reviewed Persian foods (packages/db/seed/foods_fa.csv). */
const BY_ID: Record<string, FoodIconName> = {
  "fa:chelo": "rice",
  "fa:berenj-kham": "rice-raw",
  "fa:nan-sangak": "bread-sangak",
  "fa:nan-barbari": "bread-barbari",
  "fa:nan-lavash": "bread-lavash",
  "fa:morgh-grill-sineh": "chicken",
  "fa:morgh-sorkhshodeh": "chicken-fried",
  "fa:gusht-gusaleh-khoreshti": "meat",
  "fa:ghormeh-sabzi": "stew-herb",
  "fa:gheymeh": "stew-gheymeh",
  "fa:kabab-kubideh": "kebab-koobideh",
  "fa:jujeh-kabab": "kebab-joojeh",
  "fa:salad-shirazi": "salad",
  "fa:mast": "yogurt",
  "fa:dugh": "doogh",
  "fa:chay": "tea",
  "fa:panir-feta": "cheese",
  "fa:tokhm-morgh": "egg",
  "fa:kareh": "butter",
  "fa:roghan-maye": "oil",
  "fa:khiar": "cucumber",
  "fa:gojeh": "tomato",
  "fa:adasi": "lentil",
  "fa:ash-reshteh": "ash",
  "fa:khorma": "dates",
  "fa:gerdu": "walnut",
};

/** Keyword rules for foods added later (USDA, Open Food Facts). First match wins. */
const RULES: [RegExp, FoodIconName][] = [
  [/چای|\btea\b/i, "tea"],
  [/قهوه|coffee|espresso|latte/i, "coffee"],
  [/دوغ|doogh|kefir/i, "doogh"],
  [/آبمیوه|juice|smoothie/i, "juice"],
  [/شیر(?!ینی|ازی)|\bmilk\b/i, "milk"],
  [/^آب$|\bwater\b/i, "water"],
  [/ماست|yogh?urt/i, "yogurt"],
  [/پنیر|cheese|feta/i, "cheese"],
  [/کره|butter/i, "butter"],
  [/روغن|\boil\b/i, "oil"],
  [/تخم.?مرغ|\beggs?\b|omelet/i, "egg"],
  [/کوبیده|koobideh|kofta/i, "kebab-koobideh"],
  [/جوجه|joojeh|skewer/i, "kebab-joojeh"],
  [/کباب|kebab|kabob/i, "kebab-koobideh"],
  [/سرخ.?شده.*مرغ|مرغ.*سرخ|fried chicken|nugget/i, "chicken-fried"],
  [/مرغ|chicken|turkey/i, "chicken"],
  [/ماهی|fish|salmon|tuna|shrimp|میگو/i, "fish"],
  [/گوشت|beef|lamb|steak|veal|meat/i, "meat"],
  [/قورمه|ghormeh/i, "stew-herb"],
  [/قیمه|gheymeh/i, "stew-gheymeh"],
  [/خورش|stew|curry/i, "stew-herb"],
  [/آش|\bash\b/i, "ash"],
  [/عدس|lentil|بنشن|legume|bean|لوبیا|نخود|chickpea/i, "lentil"],
  [/سوپ|soup|broth/i, "soup"],
  [/برنج خام|raw rice/i, "rice-raw"],
  [/برنج|چلو|پلو|rice|risotto/i, "rice"],
  [/ماکارونی|pasta|spaghetti|noodle|رشته/i, "pasta"],
  [/پیتزا|pizza/i, "pizza"],
  [/ساندویچ|burger|همبرگر|sandwich|wrap/i, "sandwich"],
  [/سنگک|sangak/i, "bread-sangak"],
  [/بربری|barbari/i, "bread-barbari"],
  [/لواش|lavash|tortilla|pita/i, "bread-lavash"],
  [/نان|bread|toast|bagel/i, "bread"],
  [/سالاد|salad/i, "salad"],
  [/خیار|cucumber/i, "cucumber"],
  [/گوجه|tomato/i, "tomato"],
  [/چیپس|پفک|chips|crisps|popcorn/i, "chips"],
  [/سیب.?زمینی|potato|fries/i, "potato"],
  [/سبزی|herb|spinach|اسفناج|کاهو|lettuce/i, "herbs"],
  [/خرما|\bdates?\b/i, "dates"],
  [/گردو|walnut/i, "walnut"],
  [/پسته|بادام|فندق|آجیل|pistachio|almond|hazelnut|cashew|\bnuts?\b/i, "nuts"],
  [/انار|pomegranate/i, "pomegranate"],
  [/هندوانه|خربزه|watermelon|melon/i, "watermelon"],
  [/انگور|کشمش|grape|raisin/i, "grapes"],
  [/موز|banana/i, "banana"],
  [/پرتقال|نارنگی|لیمو|orange|tangerine|lemon|lime|citrus/i, "orange"],
  [/سیب|apple|pear|گلابی/i, "apple"],
  [/میوه|fruit|berry|توت|peach|هلو|kiwi/i, "fruit"],
  [/شکلات|chocolate|cocoa/i, "chocolate"],
  [/بیسکویت|کلوچه|cookie|biscuit|cracker/i, "cookie"],
  [/کیک|شیرینی|زولبیا|بامیه|cake|pastry|dessert|candy|sweet/i, "cake"],
];

export interface IconLookup {
  id?: string;
  name_fa?: string;
  name_en?: string;
  tags?: readonly string[];
}

/** Icon for a food: exact id first, then keywords in Persian/English names and tags, else "dish". */
export function foodIconName(food: IconLookup): FoodIconName {
  if (food.id && BY_ID[food.id]) return BY_ID[food.id]!;
  const hay = [food.name_fa, food.name_en, ...(food.tags ?? [])].filter(Boolean).join(" ");
  for (const [re, name] of RULES) if (re.test(hay)) return name;
  return "dish";
}

/** Serialise one icon to a standalone SVG string (for the bot, emails, exports). */
export function foodIconSvg(name: FoodIconName, opts: { size?: number; stroke?: string; strokeWidth?: number } = {}): string {
  const { size = 24, stroke = "currentColor", strokeWidth = 1.75 } = opts;
  const def: FoodIconDef = FOOD_ICONS[name];
  const body = def.els
    .map((el) => {
      if ("p" in el) return `<path d="${el.p}"/>`;
      if ("c" in el) return `<circle cx="${el.c[0]}" cy="${el.c[1]}" r="${el.c[2]}"${el.f ? ` fill="${stroke}" stroke="none"` : ""}/>`;
      if ("e" in el) {
        const [cx, cy, rx, ry, rot = 0] = el.e;
        return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ""}/>`;
      }
      const [x, y, w, h, rx = 0] = el.r;
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
    })
    .join("");
  const g = def.rot ? `<g transform="rotate(${def.rot} 12 12)">${body}</g>` : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${def.fa}">${g}</svg>`;
}
