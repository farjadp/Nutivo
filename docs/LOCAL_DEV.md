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

## بات تلگرام (فاز ۲)
- توکن BotFather را در پنل ادمین بگذار: تنظیمات ← کانال‌ها ← «بات تلگرام». با تلگرام چک و رمزنگاری‌شده ذخیره می‌شود.
- `NUTIVO_BOT_SECRET` در `apps/web/.env.local` و `apps/bot/.env` باید یکی باشد (`openssl rand -hex 32`).
- با وب‌اپ روشن، در یک تب جدای ترمینال: `pnpm bot`. بات توکن را از وب‌اپ می‌گیرد و اگر هنوز ثبت نشده باشد، هر ۱۰ ثانیه دوباره چک می‌کند.
- بات فقط تا وقتی کار می‌کند که آن تب و وب‌اپ باز باشند. پیام‌هایی که در این فاصله برسند، تلگرام تا ۲۴ ساعت نگه می‌دارد.
- بدون تلگرام: `pnpm bot:sim` بات واقعی را با یک شبیه‌ساز در برابر API و دیتابیس واقعی اجرا می‌کند.
- کارت تصویری امروز با داده نمونه: http://localhost:3000/dev/card (`?state=over|complete|empty`).
- گزارش شبانه برای یک کاربر بدون انتظار تا ساعت ۲۱: `http://localhost:3000/api/cron/nightly?force=1&user=<id>` (فقط توسعه).

## اپ موبایل (فاز ۳، Expo)
- یک‌بار: `cp apps/mobile/.env.example apps/mobile/.env.local` و کلید anon را از `pnpm db:status` بگذار.
- وب‌اپ باید روشن باشد (`pnpm dev`)؛ اپ از `/api/app/*` با توکن Supabase خود کاربر کار می‌کند. حالت بررسی وب (`NUTIVO_AUTH_DISABLED`) روی این مسیر اثری ندارد.
- iOS: `pnpm --filter @nutivo/mobile ios`. اندروید: `pnpm --filter @nutivo/mobile android` (امولاتور `taghvim36`). روی امولاتور اندروید `127.0.0.1` خودکار به `10.0.2.2` تبدیل می‌شود.
- اگر `pod install` با خطای `Unicode Normalization` شکست خورد: `export LANG=en_US.UTF-8` و دوباره.
- اندروید با JDK 21 بیلد می‌شود (JDK 25 داخل Android Studio در CMake خطا می‌دهد): `export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`.
- اگر Metro از بیلد iOS روشن است، اندروید را با `pnpm --filter @nutivo/mobile exec expo run:android --no-bundler` اجرا کن تا به همان Metro وصل شود.
- ورود: ایمیل بزن، کد شش‌رقمی را از http://127.0.0.1:56324 بردار. قالب ایمیل در `packages/db/supabase/templates/` است و هم کد دارد هم لینک وب. روی پروژه ابری باید همین قالب را در Authentication → Email Templates بگذاری.
- پوشه‌های `ios/` و `android/` ساخته می‌شوند و در گیت نیستند؛ تنظیمات بومی فقط در `app.json`.
- فونت‌ها در `apps/mobile/assets/fonts/` نسخه‌های ثابت IRANYekanX هستند که نام داخلی هر وزن جدا شده (iOS وزن‌ها را با نام داخلی از هم تشخیص می‌دهد).

## لوگو
- فایل‌های اصلی در `docs/brand/vector/` هستند. بعد از تعویضشان: `pnpm --filter @nutivo/web exec node scripts/build-brand-assets.mjs` همه آیکن‌ها را از نو می‌سازد.

## پروژه ابری
پروژه Supabase ابری `Nutivo` (ca-central-1) ساخته شده و مهاجرت‌ها (۰۰۰۱ تا ۰۰۱۳) رویش اعمال شده، ولی اپ فعلاً به آن وصل نیست. مقادیرش به‌صورت کامنت در `.env.local` مانده است. تصمیم دیتابیس و هاست نهایی بعد از تکمیل کار گرفته می‌شود.
