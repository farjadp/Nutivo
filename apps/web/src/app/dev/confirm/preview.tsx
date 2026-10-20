"use client";
import { SAMPLE_FOODS } from "@/entities/day/sample";
import type { Draft } from "@/features/log-meal/model/draft";
import { ConfirmSheet } from "@/features/log-meal/ui/confirm-sheet";

const F = SAMPLE_FOODS;
const DRAFT: Draft = {
  meal_type: "lunch",
  raw_input: "ظهر دو کفگیر برنج، یه تیکه مرغ و یه کاسه سالاد شیرازی",
  input_channel: "web_text",
  photo_path: null,
  photo_preview_url: null,
  eaten_at: "2026-10-20T13:10:00-04:00",
  question: "مرغ گریل بود یا سرخ‌شده؟",
  foods: { [F.chelo.id]: F.chelo, [F.chicken.id]: F.chicken, [F.shirazi.id]: F.shirazi, [F.jujeh.id]: F.jujeh },
  units: {
    [F.chelo.id]: [{ food_id: F.chelo.id, unit_fa: "کفگیر", unit_en: "kafgir", grams_default: 100, grams_min: 80, grams_max: 130 }],
    [F.chicken.id]: [],
    [F.shirazi.id]: [{ food_id: F.shirazi.id, unit_fa: "کاسه", unit_en: "bowl", grams_default: 150, grams_min: 100, grams_max: 250 }],
    [F.jujeh.id]: [{ food_id: F.jujeh.id, unit_fa: "سیخ", unit_en: "skewer", grams_default: 150, grams_min: 120, grams_max: 200 }],
  },
  items: [
    { key: "a", name_raw: "دو کفگیر برنج", qty: 2, unit: "کفگیر", confidence: "high", from_photo: false, food_id: F.chelo.id, candidate_ids: [F.chelo.id], grams: 200, is_estimated: false },
    { key: "b", name_raw: "یه تیکه مرغ", qty: 1, unit: "تکه", confidence: "medium", from_photo: false, food_id: F.chicken.id, candidate_ids: [F.chicken.id, F.jujeh.id], grams: null, is_estimated: false, question: "مرغ گریل بود یا سرخ‌شده؟ و حدوداً چند گرم؟" },
    { key: "c", name_raw: "یه کاسه سالاد شیرازی", qty: 1, unit: "کاسه", confidence: "high", from_photo: false, food_id: F.shirazi.id, candidate_ids: [F.shirazi.id], grams: 150, is_estimated: false },
  ],
};

export function ConfirmPreview() {
  return (
    <main className="min-h-dvh bg-ground">
      <ConfirmSheet draft={DRAFT} saving={false} error={null} onCancel={() => {}} onConfirm={() => {}} />
    </main>
  );
}
