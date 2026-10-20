# Nutivo — اجرای محلی با Docker

تا تصمیم نهایی درباره زیرساخت (دیتابیس، هاست، ایمیل)، همه‌چیز روی Supabase محلی داخل Docker اجرا می‌شود. کد اپ تغییری نمی‌کند؛ فقط آدرس و کلیدها در `apps/web/.env.local` به استک محلی اشاره می‌کنند.

## یک‌بار
```bash
pnpm install
pnpm db:start      # Postgres + Auth + Storage در Docker (پورت‌های 56xxx)
pnpm db:demo       # ۳۴ کاربر نمونه با دو هفته وعده و لاگ
pnpm db:figfit     # اختیاری: ~۱۱ هزار غذای فارسی FigFit (غیرتجاری، فقط لوکال؛ CSVها را در packages/db/seed/external/figfit بگذار)
pnpm dev           # اپ روی http://localhost:3000
```

## آدرس‌ها
| سرویس | آدرس |
|---|---|
| اپ | http://localhost:3000 |
| پنل ادمین | http://localhost:3000/admin |
| Supabase Studio (جدول‌ها و SQL) | http://127.0.0.1:56323 |
| صندوق ایمیل محلی Mailpit (لینک‌های ورود) | http://127.0.0.1:56324 |
| API | http://127.0.0.1:56321 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:56322/postgres |

پورت‌ها 56xxx هستند تا با استک محلی پروژه‌های دیگر (مثلاً karvan روی 54321) تداخل نداشته باشند.

## کارهای رایج
- `pnpm db:reset` همه داده را پاک می‌کند، مهاجرت‌ها و seed را دوباره اجرا می‌کند. بعدش `pnpm db:demo`.
- `pnpm db:stop` استک را خاموش می‌کند؛ داده‌ها در volume داکر می‌مانند.
- `pnpm db:status` کلیدها و آدرس‌ها را نشان می‌دهد.
- بعد از `pnpm db:reset`، اگر FigFit می‌خواهی دوباره `pnpm db:figfit` بزن.
- فقط یک `pnpm dev` در هر لحظه. دو نسخه همزمان پوشه `.next` را خراب می‌کنند (اسکریپت روی پورت ۳۰۰۰ قفل است).

## ورود
- حالت بررسی بدون ورود: `NUTIVO_AUTH_DISABLED=true` در `.env.local` (فقط محیط توسعه).
- برای تست ورود واقعی آن را `false` کن، ایمیل بزن، لینک را از http://127.0.0.1:56324 باز کن. ایمیل‌های `@nutivo.test` کاربرهای نمونه‌اند؛ `sara.k@nutivo.test` ادمین است و `mina.t@nutivo.test` مسدود.

## پروژه ابری
پروژه Supabase ابری `Nutivo` (ca-central-1) ساخته شده و مهاجرت‌ها رویش اعمال شده، ولی اپ فعلاً به آن وصل نیست. مقادیرش به‌صورت کامنت در `.env.local` مانده است. تصمیم دیتابیس و هاست نهایی بعد از تکمیل کار گرفته می‌شود.
