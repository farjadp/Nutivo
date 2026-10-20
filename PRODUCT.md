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

Name: Nutivo. Tagline: "Eat Smarter. Live Better." Binding brand document: Notion "سند هویت بصری Nutivo" v1.0 (https://app.notion.com/p/3ff370c6d62481c9ba34ef451d8593fe), supplied by the founder on 2026-10-20. It pins the visual world; it overrides any concept roll.

- Colors: Persian Green #00A693 (primary, action, user), Imperial Purple #66023C (secondary, AI insight, premium). Deep Green #007F71 for buttons with white text. Neutrals: Royal White #FAF9F6 ground, #FFFFFF cards, Charcoal #20252B text, Slate #667085 secondary text, #E5E7EB borders. Mint #EAF8F5 and Soft Purple #F5EAF0 tints. Ratio guide ~70/20/10 neutral/green/purple.
- Rule: green = what the user does; purple = what Nutivo analyses. Purple never competes with green for attention.
- Semantic: success #16803C, warning #D97706, error #DC2626 (real errors only), info #2563EB. Going over calories is a soft warning with an explanation, never red.
- Chart colors: calories #00A693, protein #66023C, carbs #2563EB, fat #D97706; target always visible; estimated values visually distinct from confirmed.
- Type: IRANYekanX variable with Persian numerals (Persian; founder's licensed Fontiran font, chosen 2026-10-20 from the founder's font folder), Plus Jakarta Sans (English); tabular figures for nutrition numbers. Scale: display 32–40 bold, page 24 bold, section 20 semibold, card 16 semibold, body 14–16, caption 12–13.
- UI: minimal, calm, data-driven. Card radius 16, button radius 12, 8px grid, very soft shadows, no heavy shadows, no stacked gradients, no decorative glass. Icons: Lucide, outline/rounded, 1.75–2px stroke.
- Logo: abstract geometric symbol + wordmark (balance + intelligence); no apple, fork, plate, or digital brain.
- Logo board (founder, 2026-10-20, docs/brand/nutivo-logo-board.webp): arch split Deep Green / Imperial Purple with a leaf, plus the «Nutivo» wordmark; app icon is the white mark on Deep Green. The board labels Persian type as Vazirmatn; that label is wrong. Persian type stays IRANYekanX (founder, 2026-10-20). In-app vectors are interim traces from the board until the designer's originals arrive.
- Voice: scientific but simple, supportive not judgmental, actionable, honest about accuracy.
- Iranian identity shows in color, finesse and character, not historical ornament. Unverified historical claims about the purple stay out of brand copy.
- Founder also wants animation and gamification: behaviour-based (logging streaks, "complete day", weekly badge), never calorie-shaming, one forgiven day per week. No Inter/Arial, no purple-blue gradients, no bounce easing, no nested cards (founder's global rule).

- Mascot (founder, 2026-10-20): «نوتی», a mischievous, energetic little girl who says funny things; she voices Nutivo Insight. Never comments on weight/body, never guilts, numbers only from the engine, can be switched off. Full persona: docs/MASCOT.md.

Implementation notes (measured 2026-10-20, to resolve in DESIGN.md):
- #00A693 on white is 3.05:1 and on #FAF9F6 2.9:1: fine for fills, rings and large shapes, not for body text or small labels. Text in green uses #007F71 (4.91:1).
- Protein uses the AI color in charts, which blurs "purple = Nutivo's analysis". Keep the brand's mapping but always pair the protein series with its label so color is never the only cue.
- #66023C is unreadable on dark grounds (1.2:1 on #20252B); dark mode needs a lightened purple and green variant.
- #D97706 on white is 3.19:1: use for fills and icons; warning text needs a darker amber.

## Evidence on Hand

FigFit food database (Kaggle, CC BY-NC-SA 4.0): ~11k Persian foods loaded locally for the founder's personal, non-commercial use only; off in production; must be removed or licensed before any commercial use (packages/db/seed/README.md).

Founder's own nightly-report prompt (the original spec, in PLAN.md's history). Sketch artifact with five wireframes. No user data, testimonials, or nutrition dataset yet. Do not fabricate reviews, user counts, or clinical claims.

## Product Principles

1. Numbers come from the database and the engine, never from the model.
2. Confirm before you count: the user approves every entry.
3. The fastest log wins retention; one tap beats one sentence beats one photo.
4. Help at decision time, not just at review time.
5. Persian first, done right, not translated.

## Accessibility & Inclusion

RTL-first layout, Persian digits, prefers-reduced-motion respected, contrast ≥4.5:1 on all text, one-handed phone use as the primary scene. Health data: consent, export, and delete from day one.
