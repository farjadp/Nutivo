# Product

<!-- impeccable:product-schema 1 -->

<!-- Written 2026-10-20 from Farjad's written brief and the Nutivo sketch (PLAN.md). Facts marked [assumed] were inferred, not confirmed. -->

## Platform

web

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui, pnpm monorepo. Supabase (Postgres, Auth, RLS, Storage). Claude API with tool use for extraction and vision. Vercel for the web app. A Telegram bot (phase 2) and an Expo app (phase 3) reuse `packages/core`.

## Users

Persian speakers in Canada first (Toronto/GTA), then the global Persian-speaking market. Adults trying to lose weight gradually while keeping muscle, who eat Iranian food at home and mixed food outside. They log on a phone, often one-handed, right after or during a meal. Founder is user zero and uses the product daily for 14 days before anyone else. [assumed] Age 25–50, comfortable with apps, already tried MyFitnessPal or Cronometer and stopped.

## Product Purpose

Nutivo is an AI nutrition companion. The user logs food by text, photo, or one-tap repeat; the system turns it into confirmed items with grams and macros, shows the day against goals, answers "what should I eat now?" with the day's remaining budget, and produces a nightly Persian report. Success: the user still logs on day 7 (target D7 retention above 35%) and logs at least four days a week.

## Positioning

A Persian food database with local portion units (کفگیر، کاسه، سیخ) and realistic oil/rice/meat ratios, plus natural Persian conversation, so Iranian meals are logged in seconds without guessing. Competitors recognise "rice and chicken"; Nutivo knows what two کفگیر of چلو with a tablespoon of روغن is. Value is created during the day, at decision time, not only in the 11 pm report.

## Operating Context

Meals: صبحانه، ناهار، میان‌وعده، شام. Common inputs: a sentence in Persian or English, a plate photo, a tap on yesterday's breakfast. Nutrition sources: hand-reviewed `foods_fa` table, USDA FoodData Central, Open Food Facts. The LLM extracts and disambiguates; it never produces nutrition numbers. Nightly report at ~21:30 local time. Weight tracking weekly.

## Capabilities and Constraints

Version 1: profile and goals (kcal, protein, carbs, fat), text and photo logging with a confirmation step, quick re-log of repeated meals, today dashboard, "what should I eat" suggestions, nightly report, streaks. Every photo-derived item is marked estimated; unknown quantities trigger one question instead of a guess. Raw vs cooked weight is explicit. Only confirmed entries count toward totals. Persian UI with i18n from day one; input in Persian or English. Undecided: voice input (1.5), barcode (1.5), bilingual UI (phase 2), nutrition reviewer for `foods_fa`.

## Brand Commitments

Name: Nutivo. Voice: direct, warm, never judgmental about eating; practical next-step advice; no moralising. Animation and gamification matter to the founder: behaviour-based (logging streaks, "complete day", weekly badge), never calorie-shaming; one forgiven day per week. No pure defaults: no Inter/Arial, no purple-blue gradients, no bounce easing, no nested cards (founder's global rule). Persian typography done properly (ZWNJ, Persian digits, RTL).

## Evidence on Hand

Founder's own nightly-report prompt (the original spec, in PLAN.md's history). Sketch artifact with five wireframes. No user data, testimonials, or nutrition dataset yet. Do not fabricate reviews, user counts, or clinical claims.

## Product Principles

1. Numbers come from the database and the engine, never from the model.
2. Confirm before you count: the user approves every entry.
3. The fastest log wins retention; one tap beats one sentence beats one photo.
4. Help at decision time, not just at review time.
5. Persian first, done right, not translated.

## Accessibility & Inclusion

RTL-first layout, Persian digits, prefers-reduced-motion respected, contrast ≥4.5:1 on all text, one-handed phone use as the primary scene. Health data: consent, export, and delete from day one.
