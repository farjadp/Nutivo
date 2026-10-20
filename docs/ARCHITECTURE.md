# Nutivo — معماری (خلاصه فنی)

## اصل
```
input (text | photo | quick) → Claude extract_meal (JSON) → resolve (foods_fa → USDA → OFF)
→ ask ≤1 question → core.calc → user confirms → Supabase → dashboard / nightly report
```
مدل زبانی هیچ عدد تغذیه‌ای تولید نمی‌کند. اعداد از `foods` + `portion_units` و موتور `@nutivo/core` می‌آیند و روی `entry_items` فریز می‌شوند.

## پکیج‌ها
- `packages/core`: اسکیماها (zod)، واحدها، محاسبه، اهداف، گزارش، پرامپت‌ها. بدون وابستگی به Next یا Supabase.
- `packages/db`: مهاجرت‌های Supabase، CSV غذاهای ایرانی، اعتبارسنج seed.
- `apps/web`: Next.js 15، RTL، Vazirmatn. Server Actions برای ثبت؛ Route Handler برای cron گزارش شبانه.
- `apps/bot` (فاز ۲)، `apps/mobile` (فاز ۳): فقط رابط روی همان core و همان جدول‌ها.
- `apps/mobile`: Expo SDK 57، Expo Router، Uniwind (Tailwind 4). ورود با کد ایمیلی Supabase؛ همه کارها از `POST /api/app/<action>` در وب‌اپ با `Authorization: Bearer <access token>` کاربر. این مسیر همان سرویس بات (`features/bot/api/service.server.ts`) را با `channel: "mobile"` صدا می‌زند، پس ثبت، پیش‌نویس، روز و گزارش در هر سه کانال یکی است.

## جریان عکس
۱) آپلود به Supabase Storage (bucket خصوصی `meal-photos`) ۲) Claude vision با همان tool `extract_meal`، `from_photo=true` ۳) هر آیتم `is_estimated=true` ۴) صفحه تأیید همان صفحه متن است.

## گزارش شبانه
Route Handler `/api/cron/nightly` (Vercel Cron، هر ساعت) → برای کاربرانی که ساعت محلی‌شان `NUTIVO_REPORT_HOUR_LOCAL` است، `core.buildDailyReport` → متن تحلیل با Claude (ورودی: فقط اعداد محاسبه‌شده) → `daily_reports`.

## محیط
`apps/web/.env.example` را کپی کن. کلیدها هرگز در کد نیستند.

## Supabase (production project)
- پروژه: `Nutivo` در سازمان Ashavid، منطقه `ca-central-1`، شناسه `jspcgzwdowgzmcpcstnu` (۲۰ اکتبر ۲۰۲۶).
- مهاجرت‌های اعمال‌شده: `0001_init`، `0002_search_storage`، `0003_rls_perf`.
- seed: ۲۵ غذا و ۵۹ واحد. ستون `notes` در دیتابیس خالی است؛ یادداشت‌های بازبینی فقط در CSV مخزن هستند.
- Auth: Site URL پیش‌فرض `http://localhost:3000`. قبل از استقرار، دامنه واقعی را در Authentication → URL Configuration اضافه کن. ایمیل داخلی Supabase محدودیت ارسال ساعتی دارد؛ برای کاربران واقعی SMTP اختصاصی لازم است.
