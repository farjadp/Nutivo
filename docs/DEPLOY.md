# Nutivo — استقرار

## کجا
- **وب‌اپ و API موبایل:** Railway، پروژه `nutivo`، سرویس `web`، منطقه us-east4. آدرس: https://web-production-32973.up.railway.app
- **دیتابیس، ورود، عکس‌ها:** Supabase ابری، پروژه `Nutivo` (ca-central-1، شناسه `jspcgzwdowgzmcpcstnu`).
- FigFit در production نیست (مجوز غیرتجاری).

## استقرار
- مخزن روی GitHub نیست؛ از همین پوشه: `railway up --detach --service web` (پوشه یک بار با `railway link` به پروژه وصل شده).
- ساخت: `pnpm --filter @nutivo/web build`، اجرا: `pnpm --filter @nutivo/web start`، بررسی سلامت: `/login`.
- Railway وابستگی‌های آسیب‌پذیر را بلاک می‌کند (مثلاً Next 15.5.4 رد شد). اگر بیلد با «SECURITY VULNERABILITIES» شکست خورد، نسخه گفته‌شده را نصب کن.

## متغیرها
غیرمحرمانه‌ها روی سرویس تنظیم شده‌اند. این‌ها محرمانه‌اند و فقط از داشبورد Railway وارد می‌شوند:
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API Keys)
- `ANTHROPIC_API_KEY`
- `NUTIVO_SECRETS_KEY`، `CRON_SECRET`، `NUTIVO_BOT_SECRET`: هر کدام یک مقدار تازه (`openssl rand -hex 32`). کلیدهای ذخیره‌شده در پنل ادمین با `NUTIVO_SECRETS_KEY` رمز می‌شوند؛ عوضش کنی، باید آن‌ها را دوباره وارد کنی.

## Supabase (تنظیمات ورود)
- قالب‌های ایمیل، عنوان‌ها، طول کد (۶) و Site URL از `packages/db/supabase/config.toml` فرستاده می‌شوند، نه از داشبورد:
  ```
  cd packages/db && pnpm exec supabase config diff --project-ref jspcgzwdowgzmcpcstnu
  pnpm exec supabase config push --project-ref jspcgzwdowgzmcpcstnu
  ```
  مقدارهای مخصوص production در بلوک `[remotes.production]` هستند؛ تنظیمات ابری که نباید عوض شوند هم آنجا ثابت شده‌اند. همیشه اول diff بگیر.
- push کامل کلید Resend را از `NUTIVO_RESEND_API_KEY` می‌خواند. بدون کلید push نکن؛ برای عوض کردن فقط قالب‌ها، از یک کپی config بدون بلوک SMTP و `--workdir` استفاده کن تا رمز SMTP دست نخورد.
- دکمه ایمیل به `/auth/confirm` روی دامنه خودمان می‌رود (نه supabase.co). اول وب را deploy کن، بعد قالب‌ها را push کن.
- کد ورود یک‌بارمصرف است و یک ساعت اعتبار دارد (`otp_expiry = 3600`)؛ اپ و وب همین یک ساعت را با نوتی می‌شمارند (`OTP_VALID_MINUTES` در core).
- رمز عبور اختیاری است: بعد از ورود با کد، از «من» گذاشته می‌شود. حداقل ۸ کاراکتر، حرف و عدد (`minimum_password_length`، `password_requirements`).
- لوگوی ایمیل از `/brand/nutivo-lockup-email.png` روی آدرس Railway بارگذاری می‌شود؛ با عوض شدن دامنه، `LOGO` را در قالب‌ها هم عوض کن.
- ایمیل داخلی Supabase در ساعت فقط چند ایمیل می‌فرستد و فرستنده‌اش «Supabase Auth» است؛ برای تسترها و نام فرستنده Nutivo، SMTP اختصاصی لازم است.

## بات تلگرام و کرون شبانه
- سرویس `bot` روی همان پروژه Railway: `railway up --detach --service bot`. ساخت `pnpm --filter @nutivo/bot typecheck`، اجرا `pnpm --filter @nutivo/bot start`، ری‌استارت همیشه. سلامت HTTP ندارد؛ لاگ را ببین.
- متغیرها همه ارجاع به سرویس web هستند (`${{web.NUTIVO_BOT_SECRET}}`، `${{web.CRON_SECRET}}`، `NUTIVO_API_URL=${{web.NEXT_PUBLIC_APP_URL}}`)؛ رمز تازه لازم نیست.
- توکن BotFather در پنل ادمین (تنظیمات → بات تلگرام) ذخیره می‌شود؛ بات هر ۱۰ ثانیه چک می‌کند و خودش بالا می‌آید. وب هم برای ارسال گزارش شبانه همان توکن را می‌خواند.
- همان پروسه بات هر ساعت در دقیقه ۳۰ (UTC) `GET /api/cron/nightly` را با `CRON_SECRET` صدا می‌زند؛ گزارش ساعت ۲۱ و ناخنک ساعت ۲۰ هر کاربر از همین‌جا می‌روند. سرویس cron جدا نداریم.
- **با بات محلی هم‌زمان اجرا نکن:** دو long polling روی یک توکن با خطای 409 به هم می‌خورند. برای تست محلی از یک بات دوم BotFather استفاده کن.
- تنظیمات ساخت و اجرای سرویس با `railway environment edit` ذخیره نشد؛ با `railway api` و `serviceInstanceUpdate` ثبت شد.
