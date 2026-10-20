import { NextResponse } from "next/server";
import type { DayView } from "@nutivo/core";
import { dayCardSvg, renderPng } from "@/features/bot/api/card.server";

/** Development only: the Telegram «امروز» card with sample numbers (?state=empty|over|complete). */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "not found" }, { status: 404 });
  const state = new URL(request.url).searchParams.get("state");
  const base: DayView = {
    date: "2026-10-20",
    today: "2026-10-20",
    goals: { kcal: 2066, protein_g: 148, carbs_g: 240, fat_g: 57 },
    totals: { kcal: 1466, protein_g: 103, carbs_g: 146, fat_g: 44 },
    remaining: { kcal: 600, protein_g: 45 },
    meals: [
      { meal_type: "breakfast", kcal: 420, items: [{ name: "نان سنگک", kcal: 157, estimated: false }, { name: "پنیر لیقوان / فتا", kcal: 80, estimated: false }, { name: "گردو (مغز)", kcal: 131, estimated: false }, { name: "چای", kcal: 2, estimated: false }] },
      { meal_type: "lunch", kcal: 823, items: [{ name: "زرشک پلو", kcal: 570, estimated: true }, { name: "جوجه‌کباب (سینه، پخته)", kcal: 217, estimated: true }, { name: "گوجه کبابی", kcal: 36, estimated: true }] },
      { meal_type: "snack", kcal: 223, items: [{ name: "ماست ساده پرچرب", kcal: 92, estimated: false }, { name: "خیار", kcal: 18, estimated: false }, { name: "خرما", kcal: 113, estimated: false }] },
    ],
    streak: 6,
    complete: false,
    repeats: [],
  };
  const day: DayView =
    state === "empty"
      ? { ...base, totals: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }, remaining: { kcal: 2066, protein_g: 148 }, meals: [], streak: 0 }
      : state === "over"
        ? { ...base, totals: { kcal: 2390, protein_g: 120, carbs_g: 280, fat_g: 90 }, remaining: { kcal: -324, protein_g: 28 } }
        : state === "complete"
          ? { ...base, totals: { kcal: 2010, protein_g: 140, carbs_g: 230, fat_g: 55 }, remaining: { kcal: 56, protein_g: 8 }, complete: true }
          : base;
  return new NextResponse(new Uint8Array(renderPng(dayCardSvg(day))), { headers: { "content-type": "image/png", "cache-control": "no-store" } });
}
