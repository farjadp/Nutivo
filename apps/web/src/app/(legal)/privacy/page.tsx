export const metadata = { title: "حریم خصوصی · Nutivo" };

/**
 * Privacy policy. Every line is a claim about the code: keep it in step with what the apps,
 * the bot and the database actually do (data inventory of 21 Oct 2026, card 27.7).
 */
export default function PrivacyPage() {
  return (
    <>
      <h1>حریم خصوصی</h1>
      <p className="meta">آخرین به‌روزرسانی: ۲۹ مهر ۱۴۰۵ (۲۱ اکتبر ۲۰۲۶) · <a href="#english">English</a></p>
      <p>
        Nutivo (نوتیوو) را <bdi>AshaVid Inc.</bdi> در انتاریوی کانادا می‌سازد. این صفحه می‌گوید اپ iOS و اندروید، وب‌سایت و بات تلگرام Nutivo چه داده‌ای از تو جمع می‌کنند، کجا نگه می‌دارند، با چه کسی در میان می‌گذارند و چطور پاکش کنی. ما داده‌ات را نمی‌فروشیم، تبلیغ نشان نمی‌دهیم و ابزار ردیابی یا آنالیتیکس در اپ نداریم.
      </p>

      <section>
        <h2>چه داده‌ای جمع می‌کنیم</h2>
        <ul>
          <li><strong>حساب:</strong> ایمیل، و اگر رمز گذاشته باشی، شکل رمزنگاری‌شده آن. اگر حساب را از بات تلگرام ساخته باشی، به جای ایمیل یک شناسه تلگرامی داریم.</li>
          <li><strong>پروفایل و اهداف:</strong> جنسیت، سن، قد، وزن، سطح فعالیت، هدف (کاهش، حفظ یا افزایش وزن)، کالری و درشت‌مغذی‌های روزانه، منطقه زمانی و روشن یا خاموش بودن نوتی و ناخنک.</li>
          <li><strong>وعده‌ها:</strong> متنی که برای ثبت غذا می‌نویسی، عکس غذا اگر بفرستی، زمان وعده، و ردیف‌های غذا با مقدار و کالری.</li>
          <li><strong>گزارش‌ها:</strong> جمع روزانه و تحلیل کوتاهی که برای هر روز ساخته می‌شود.</li>
          <li><strong>تلگرام (اگر وصل کنی):</strong> شناسه تلگرام، نام کاربری، نام کوچک و زبان حساب تلگرامت.</li>
          <li><strong>گزارش فنی:</strong> رویدادهایی مثل ورود، ثبت و حذف وعده، تعداد توکن‌های مصرفی هوش مصنوعی و خطاها، همراه شناسه و ایمیل حساب. برای سؤال‌های «بپرس» تا ۱۲۰ نویسه اول سؤال هم ثبت می‌شود.</li>
        </ul>
      </section>

      <section>
        <h2>Apple Health و Health Connect</h2>
        <ul>
          <li>فقط اگر خودت روشنش کنی. پیش‌فرض خاموش است.</li>
          <li>فقط می‌خوانیم: وزن، قدم‌های امروز و انرژی فعالیت امروز. هیچ‌چیز در Health نوشته نمی‌شود.</li>
          <li>قدم‌ها و انرژی فعالیت از گوشی بیرون نمی‌روند؛ فقط کنار کالری‌ات نشان داده می‌شوند.</li>
          <li>وزن فقط وقتی به سرور می‌رود که خودت «وزن را به‌روز کن» را بزنی تا پروفایلت به‌روز شود.</li>
          <li>داده Health برای تبلیغ، فروش یا آموزش مدل استفاده نمی‌شود.</li>
        </ul>
      </section>

      <section>
        <h2>روی گوشی چه می‌ماند</h2>
        <p>جلسه ورود، روشن یا خاموش بودن Health و تنظیم یادآوری‌ها فقط روی گوشی ذخیره می‌شوند. یادآوری‌ها محلی‌اند؛ اپ توکن نوتیفیکیشن به سرور نمی‌فرستد. دسترسی دوربین فقط برای عکس گرفتن از غذاست؛ انتخاب عکس از گالری با انتخابگر خود سیستم است و به همه عکس‌هایت دسترسی نمی‌دهد.</p>
      </section>

      <section>
        <h2>با این داده‌ها چه می‌کنیم</h2>
        <ul>
          <li>تخمین کالری و درشت‌مغذی‌های غذایی که ثبت می‌کنی.</li>
          <li>ساختن گزارش روزانه و پیشنهادهای «بپرس».</li>
          <li>فرستادن کد ورود به ایمیلت و پیام‌ها و گزارش‌ها در تلگرام، اگر وصلش کرده باشی.</li>
          <li>پیدا کردن خطاها و جلوگیری از سوءاستفاده.</li>
        </ul>
        <p>پایه قانونی ما رضایت توست که با ساختن حساب و روشن کردن هر قابلیت می‌دهی. هر وقت بخواهی می‌توانی آن را پس بگیری.</p>
      </section>

      <section>
        <h2>با چه کسانی در میان گذاشته می‌شود</h2>
        <p>فقط با سرویس‌هایی که Nutivo بدون آن‌ها کار نمی‌کند، و فقط به اندازه همان کار:</p>
        <ul>
          <li><strong>Supabase:</strong> پایگاه داده، ورود و نگه‌داری عکس‌ها. سرورها در کانادا (مونترال).</li>
          <li><strong>Railway:</strong> میزبانی وب‌سایت و سرور اپ، در آمریکا. داده‌ها هنگام پردازش از این سرور می‌گذرند.</li>
          <li><strong>Anthropic (Claude):</strong> عکس و متن غذا برای تخمین کالری، خلاصه روز (اسم غذاها و جمع‌ها، بدون ایمیل، سن یا جنسیت) برای گزارش، و سؤال «بپرس» همراه کالری باقی‌مانده. طبق شرایط تجاری Anthropic، داده‌هایی که از راه API فرستاده می‌شوند برای آموزش مدل‌هایشان استفاده نمی‌شوند.</li>
          <li><strong>Resend:</strong> فرستادن ایمیل کد ورود.</li>
          <li><strong>Telegram:</strong> فقط اگر بات را وصل کنی؛ پیام‌ها و عکس‌هایی که در بات می‌فرستی و گزارش‌هایی که برایت می‌فرستیم از تلگرام می‌گذرند.</li>
        </ul>
        <p>بعضی از این سرویس‌ها بیرون از کانادا هستند، پس داده‌ات ممکن است در آمریکا پردازش شود و تابع قوانین آنجا باشد. جدول غذاها از USDA و Open Food Facts از پیش وارد شده؛ متن تو برای آن‌ها فرستاده نمی‌شود. داده‌ات را به هیچ تبلیغ‌کننده یا دلال داده‌ای نمی‌دهیم یا نمی‌فروشیم.</p>
      </section>

      <section>
        <h2>چقدر نگه می‌داریم</h2>
        <ul>
          <li>تا وقتی حسابت هست. هر وعده را حذف کنی، عکسش هم پاک می‌شود.</li>
          <li>پیش‌نویس‌های تأییدنشده بات بعد از دو ساعت و کدهای اتصال تلگرام بعد از ۱۵ دقیقه پاک می‌شوند.</li>
          <li>با حذف حساب، همه داده‌ها و عکس‌ها پاک می‌شوند. ردیف‌های گزارش فنی برای آمار کلی می‌مانند، اما ایمیل و متن آزادشان پاک می‌شود و دیگر به تو برنمی‌گردند.</li>
          <li>ممکن است نسخه‌ای از داده‌ها تا مدتی کوتاه در پشتیبان‌های خودکار سرویس‌دهنده پایگاه داده بماند تا خودبه‌خود جایگزین شود.</li>
        </ul>
      </section>

      <section>
        <h2>حق‌های تو</h2>
        <ul>
          <li>دیدن و اصلاح پروفایل، اهداف و هر وعده، از داخل اپ یا وب.</li>
          <li>حذف کامل حساب از «من › حذف حساب»؛ راهنما در صفحه <a href="/delete-account">حذف حساب</a>.</li>
          <li>درخواست نسخه‌ای از داده‌هایت یا هر سؤال دیگر، از راه‌های صفحه <a href="/support">پشتیبانی</a>.</li>
          <li>اگر از جواب ما راضی نبودی، می‌توانی به دفتر کمیسر حریم خصوصی کانادا (Office of the Privacy Commissioner of Canada) شکایت کنی.</li>
        </ul>
      </section>

      <section>
        <h2>سن</h2>
        <p>Nutivo برای افراد ۱۴ سال به بالاست. اگر فکر می‌کنی کودکی کمتر از این سن حساب ساخته، خبرمان کن تا پاکش کنیم.</p>
      </section>

      <section>
        <h2>امنیت</h2>
        <p>ارتباط‌ها رمزنگاری‌شده (HTTPS) است، هر کاربر فقط به داده و عکس‌های خودش دسترسی دارد و کلیدهای سرویس‌ها رمزنگاری‌شده نگه داشته می‌شوند. هیچ سیستمی بی‌خطر نیست؛ اگر نشت داده‌ای پیش بیاید که برایت خطر جدی داشته باشد، طبق قانون خبرت می‌کنیم.</p>
      </section>

      <section>
        <h2>مسئول حریم خصوصی</h2>
        <p>فرجاد پ.د، <bdi>AshaVid Inc.</bdi>، نیومارکت، انتاریو، کانادا. از راه‌های صفحه <a href="/support">پشتیبانی</a> در دسترس است.</p>
      </section>

      <section id="english" lang="en" dir="ltr" className="border-t border-line pt-6 text-left">
        <h2>Privacy policy (English)</h2>
        <p>
          Nutivo is made by AshaVid Inc., Ontario, Canada. This covers the Nutivo iOS and Android apps, website and Telegram bot. We do not sell your data, show ads, or use analytics or tracking SDKs.
        </p>
        <p><strong>What we collect.</strong> Email (and a hashed password if you set one; Telegram-created accounts use a Telegram id instead). Profile and goals: sex, age, height, weight, activity level, goal, daily calorie and macro targets, time zone, mascot preferences. Meals: the text you type, meal photos you send, meal time, and food items with amounts and calories. Daily reports. If you link Telegram: your Telegram id, username, first name and language. Technical logs: events such as sign-in, meal logged or deleted, AI token counts and errors, with your account id and email; for «Ask» questions, the first 120 characters of the question.</p>
        <p><strong>Apple Health / Health Connect.</strong> Off by default and read-only: weight, today&apos;s steps and today&apos;s active energy. Nothing is written to Health. Steps and active energy never leave your phone. Weight is sent to our server only when you tap to use it for your profile. Health data is never used for advertising, sold, or used to train models.</p>
        <p><strong>On your device only.</strong> Your session, the Health switch and reminder settings. Reminders are local notifications; no push token is sent to us. Camera access is used only to photograph meals; choosing a photo uses the system picker.</p>
        <p><strong>Why.</strong> To estimate calories and macros, build daily reports and «Ask» suggestions, send sign-in codes and (if linked) Telegram messages, and to find errors and prevent abuse. We rely on your consent, which you can withdraw at any time.</p>
        <p><strong>Who processes it.</strong> Supabase (database, sign-in, photo storage; servers in Canada). Railway (hosting in the United States). Anthropic (meal photos and text for calorie estimates; a day summary with food names and totals but no email, age or sex for reports; «Ask» questions with remaining macros; under Anthropic&apos;s commercial terms, API data is not used to train their models). Resend (sign-in emails). Telegram (only if you use the bot). Some processing happens in the United States. Food data from USDA and Open Food Facts is imported in advance; your text is not sent to them.</p>
        <p><strong>Retention.</strong> Until you delete your account. Deleting a meal deletes its photo. Unconfirmed bot drafts are deleted after 2 hours and Telegram link codes after 15 minutes. Deleting your account deletes all your data and photos; log rows stay for aggregate counts but lose your email and free text. Copies may persist briefly in our database provider&apos;s automatic backups until they roll over.</p>
        <p><strong>Your rights.</strong> View and correct your profile, goals and meals in the app or on the web. Delete your account in the app (Me → Delete account) or see <a href="/delete-account">account deletion</a>. Ask for a copy of your data via <a href="/support">support</a>. You may complain to the Office of the Privacy Commissioner of Canada.</p>
        <p><strong>Age.</strong> Nutivo is for people aged 14 and over. Tell us if you believe a younger child has an account and we will delete it.</p>
        <p><strong>Contact.</strong> Privacy officer: Farjad P.D, AshaVid Inc., Newmarket, Ontario, Canada, via the channels on the <a href="/support">support</a> page.</p>
      </section>
    </>
  );
}
