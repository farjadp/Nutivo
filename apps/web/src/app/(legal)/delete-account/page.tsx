export const metadata = { title: "حذف حساب · Nutivo" };

/** Public account-deletion instructions (Google Play requires a page reachable signed out). */
export default function DeleteAccountPage() {
  return (
    <>
      <h1>حذف حساب Nutivo</h1>
      <p>هر وقت بخواهی می‌توانی حسابت را خودت، همان لحظه و بدون تماس با ما پاک کنی.</p>

      <section>
        <h2>از اپ (iOS یا اندروید)</h2>
        <ol>
          <li>وارد حسابت شو و به زبانه «من» برو.</li>
          <li>پایین صفحه «حذف حساب» را بزن.</li>
          <li>برای تأیید، کلمه «حذف» را بنویس و دکمه حذف را بزن.</li>
        </ol>
      </section>

      <section>
        <h2>از وب‌سایت</h2>
        <ol>
          <li>
            در <a href="/login">صفحه ورود</a> وارد شو و به «من» برو.
          </li>
          <li>«حذف حساب» را بزن، «حذف» را بنویس و تأیید کن.</li>
        </ol>
        <p>
          اگر به حسابت دسترسی نداری، از راه‌های صفحه <a href="/support">پشتیبانی</a> با ایمیل حسابت پیام بده تا حذفش کنیم.
        </p>
      </section>

      <section>
        <h2>چه چیزی پاک می‌شود</h2>
        <ul>
          <li>حساب و ایمیل، و رمز اگر گذاشته بودی.</li>
          <li>پروفایل و اهداف، همه وعده‌ها، عکس‌های غذا، گزارش‌های روزانه و وعده‌های تکراری.</li>
          <li>اتصال تلگرام و هر پیش‌نویس یا وضعیت بات.</li>
        </ul>
      </section>

      <section>
        <h2>چه چیزی می‌ماند</h2>
        <p>ردیف‌های گزارش فنی (مثل «یک وعده ثبت شد») برای آمار کلی می‌مانند، اما ایمیل و متن آزادشان پاک می‌شود و دیگر به تو برنمی‌گردند. ممکن است نسخه‌ای از داده‌ها تا مدتی کوتاه در پشتیبان‌های خودکار سرویس‌دهنده پایگاه داده بماند تا خودبه‌خود جایگزین شود. Apple Health و Health Connect دست نمی‌خورند، چون Nutivo چیزی در آن‌ها ننوشته است.</p>
      </section>

      <section id="english" lang="en" dir="ltr" className="border-t border-line pt-6 text-left">
        <h2>Delete your Nutivo account (English)</h2>
        <p><strong>In the app:</strong> sign in, open the «من» (Me) tab, tap «حذف حساب» (Delete account), type «حذف» to confirm and tap Delete. Deletion is immediate.</p>
        <p><strong>On the web:</strong> sign in at <a href="/login">the sign-in page</a>, open «من» (Me), tap «حذف حساب», type «حذف» and confirm. If you cannot sign in, contact us via <a href="/support">support</a> from your account email and we will delete it.</p>
        <p><strong>Deleted:</strong> your account, email and password; profile and goals; all meals, meal photos, daily reports and saved repeats; your Telegram link and any bot drafts or bot state.</p>
        <p><strong>Kept:</strong> technical log rows for aggregate counts, with your email and free text removed. Copies may persist briefly in our database provider&apos;s automatic backups until they roll over. Apple Health and Health Connect are untouched, since Nutivo never writes to them.</p>
      </section>
    </>
  );
}
