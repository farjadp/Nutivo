import { readFile } from "node:fs/promises";
import path from "node:path";
import { macrosForGrams } from "@nutivo/core";
import { NextResponse } from "next/server";
import { extractMeal } from "@/features/log-meal/api/extract.server";
import { resolveMeal } from "@/features/log-meal/api/resolve.server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Development only: runs the real photo pipeline (Claude vision → food search → grams) on a file in
 * tests/photos and returns what the confirm screen would show. Nothing is saved.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "not found" }, { status: 404 });
  const name = new URL(request.url).searchParams.get("name") ?? "";
  if (!/^[a-z0-9-]{1,60}$/.test(name)) return NextResponse.json({ error: "bad name" }, { status: 400 });
  const file = path.resolve(process.cwd(), "../../tests/photos", `${name}.jpg`);
  let bytes: Buffer;
  try {
    bytes = await readFile(file);
  } catch {
    return NextResponse.json({ error: "no such photo" }, { status: 404 });
  }
  if (new URL(request.url).searchParams.get("raw") === "1") {
    return new NextResponse(new Uint8Array(bytes), { headers: { "content-type": "image/jpeg", "cache-control": "no-store" } });
  }
  try {
    const ex = await extractMeal({ image: { base64: bytes.toString("base64"), mediaType: "image/jpeg" }, nowISO: new Date().toISOString() });
    const supabase = await createClient();
    const r = await resolveMeal(supabase, ex.meal);
    const items = r.items.map((it) => {
      const food = it.food_id ? r.foods[it.food_id] : undefined;
      return {
        said: it.name_raw,
        qty: it.qty,
        unit: it.unit,
        food: food?.name_fa ?? null,
        source: food?.source ?? null,
        grams: it.grams,
        kcal: food && it.grams ? Math.round(macrosForGrams(food, it.grams).kcal) : null,
        estimated: it.is_estimated,
        question: it.question ?? null,
        candidates: it.candidate_ids.map((id) => r.foods[id]?.name_fa).filter(Boolean).slice(0, 3),
      };
    });
    return NextResponse.json({ name, meal_type: ex.meal.meal_type, ms: ex.ms, usage: ex.usage, items });
  } catch (err) {
    return NextResponse.json({ name, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
