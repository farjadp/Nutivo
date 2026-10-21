import "server-only";
import { normalizeFa, searchFa, toGrams, UnitResolutionError, type Food, type ParsedMeal, type PortionUnit } from "@nutivo/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { foodFromRow, unitFromRow } from "@/entities/food/map";
import { excludedFoodSources } from "@/shared/config";
import type { DraftItem } from "../model/draft";

const MATCH_THRESHOLD = 0.35;

const PREP_WORDS: Record<string, string> = { fried: "سرخ شده", grilled: "گریل", boiled: "آب پز" };

/** Strip quantity words so «دو کفگیر برنج» searches as «برنج». */
function searchTerm(name: string, unit: string): string {
  return searchFa(name)
    .replace(new RegExp(normalizeFa(unit), "g"), " ")
    .replace(/[0-9.]+/g, " ")
    // \b is ASCII-only in JS, so match Persian filler words between spaces.
    .replace(/(^|\s)(یک|یه|دو|سه|چهار|پنج|نصف|تا|عدد|تیکه|تکه|کمی|مقداری)(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function resolveMeal(supabase: SupabaseClient, meal: ParsedMeal) {
  const perItem = await Promise.all(
    meal.items.map(async (it) => {
      const base = searchTerm(it.name_raw, it.unit) || searchFa(it.name_raw);
      const search = async (q: string) => {
        const { data, error } = await supabase.rpc("search_foods", { q, lim: 5, exclude_sources: excludedFoodSources() });
        if (error) throw new Error(`search_foods failed: ${error.message}`);
        return (data ?? []) as { id: string; score: number }[];
      };
      const hits = await search(base);
      // The cooking word only refines a match; it must never outweigh the food's own name
      // («ته‌دیگ» + «سرخ شده» used to land on fried chicken).
      const prep = it.prep_hint ? PREP_WORDS[it.prep_hint] : undefined;
      if (prep && !base.includes(prep) && (hits[0]?.score ?? 0) < 0.95) {
        const withPrep = await search(`${base} ${prep}`);
        const names = new Set(hits.map((h) => h.id));
        const refined = withPrep.find((h) => names.has(h.id));
        if (refined && refined.id !== hits[0]?.id && refined.score > (hits[0]?.score ?? 0)) {
          return { it, hits: [refined, ...hits.filter((h) => h.id !== refined.id)] };
        }
      }
      return { it, hits };
    }),
  );

  const ids = [...new Set(perItem.flatMap((p) => p.hits.map((h) => h.id)))];
  const foods: Record<string, Food> = {};
  const units: Record<string, PortionUnit[]> = {};
  if (ids.length) {
    const [{ data: foodRows, error: fErr }, { data: unitRows, error: uErr }] = await Promise.all([
      supabase.from("foods").select("*").in("id", ids),
      supabase.from("portion_units").select("*").in("food_id", ids),
    ]);
    if (fErr) throw new Error(`foods query failed: ${fErr.message}`);
    if (uErr) throw new Error(`portion_units query failed: ${uErr.message}`);
    for (const r of foodRows ?? []) {
      const f = foodFromRow(r);
      foods[f.id] = f;
      units[f.id] = [];
    }
    for (const r of unitRows ?? []) {
      const u = unitFromRow(r);
      (units[u.food_id] ??= []).push(u);
    }
  }

  const items: DraftItem[] = perItem.map(({ it, hits }, i) => {
    const best = hits[0] && hits[0].score >= MATCH_THRESHOLD ? hits[0].id : null;
    const food = best ? foods[best] : undefined;
    let grams: number | null = null;
    let is_estimated = it.from_photo;
    let question = it.needs_question;
    if (food) {
      try {
        const g = toGrams(it.qty, it.unit, food, units[food.id] ?? []);
        grams = Math.round(g.grams);
        is_estimated = is_estimated || g.is_estimated;
      } catch (err) {
        if (!(err instanceof UnitResolutionError)) throw err;
        question ??= err.question;
      }
    } else {
      question ??= `«${it.name_raw}» را در فهرست غذاها پیدا نکردم. یکی از گزینه‌ها را انتخاب کن یا حذفش کن.`;
    }
    return {
      key: `d${i}-${Date.now().toString(36)}`,
      name_raw: it.name_raw,
      qty: it.qty,
      unit: it.unit,
      prep_hint: it.prep_hint,
      confidence: it.confidence,
      from_photo: it.from_photo,
      food_id: food?.id ?? null,
      candidate_ids: hits.map((h) => h.id).filter((id) => foods[id]),
      grams,
      is_estimated,
      question,
    };
  });

  return { items, foods, units };
}
