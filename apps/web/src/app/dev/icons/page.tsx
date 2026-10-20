import { FOOD_ICON_NAMES, FOOD_ICONS } from "@nutivo/core";
import { notFound } from "next/navigation";
import { FoodIcon } from "@/shared/ui/food-icon";

export const metadata = { title: "آیکن‌های غذا · Nutivo" };

/** Development-only icon sheet: every food icon at working sizes, light and on brand tiles. */
export default async function IconsPage({ searchParams }: { searchParams: Promise<{ big?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const big = (await searchParams).big !== undefined;
  if (big)
    return (
      <main className="grid grid-cols-6 gap-6 bg-surface p-6 text-ink">
        {FOOD_ICON_NAMES.map((n) => (
          <figure key={n} className="grid justify-items-center gap-1">
            <FoodIcon name={n} size={72} label="" />
            <figcaption className="text-xs text-ink-2">{FOOD_ICONS[n].fa}</figcaption>
          </figure>
        ))}
      </main>
    );
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">آیکن‌های غذا</h1>
      <p className="mt-1 text-sm text-ink-2">{FOOD_ICON_NAMES.length} آیکن · شبکه ۲۴ · خط ۱٫۷۵ · گوشه گرد · رنگ از متن</p>
      <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
        {FOOD_ICON_NAMES.map((n) => (
          <li key={n} className="grid justify-items-center gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-3">
            <span className="grid size-14 place-items-center rounded-[12px] bg-mint text-green-ink">
              <FoodIcon name={n} size={32} label="" />
            </span>
            <div className="flex items-end gap-2 text-ink">
              <FoodIcon name={n} size={24} label="" />
              <FoodIcon name={n} size={16} label="" />
            </div>
            <span className="text-center text-xs">{FOOD_ICONS[n].fa}</span>
            <code dir="ltr" className="font-mono text-[10px] text-ink-2">{n}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}
