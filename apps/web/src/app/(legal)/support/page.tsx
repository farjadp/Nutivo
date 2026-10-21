export const metadata = { title: "پشتیبانی · Nutivo" };

/** Support contact for app users and store reviewers. Same channels as «من › پشتیبانی» in the app. */
export default function SupportPage() {
  return (
    <>
      <h1>پشتیبانی</h1>
      <p>سؤالی داری، چیزی درست کار نمی‌کند یا پیشنهادی داری؟ از یکی از این راه‌ها بنویس. معمولاً تا یک روز کاری جواب می‌دهیم.</p>
      <section>
        <h2>راه‌های تماس</h2>
        <ul>
          <li>
            تلگرام: <a href="https://t.me/farjadtalks">@farjadtalks</a>
          </li>
          <li>
            تلفن و واتس‌اپ: <a href="tel:+14376611674" dir="ltr">+1 437 661 1674</a>
          </li>
          <li>
            وب‌سایت: <a href="https://www.farjadp.com">farjadp.com</a>
          </li>
        </ul>
      </section>
      <section>
        <h2>سؤال‌های رایج</h2>
        <p>
          <strong>کد ورود نیامد.</strong> پوشه اسپم را نگاه کن. کد یک ساعت اعتبار دارد و بعد از یک دقیقه می‌شود دوباره فرستاد. اگر در «من» رمز گذاشته‌ای، با رمز هم وارد می‌شوی.
        </p>
        <p>
          <strong>کالری یک غذا درست نیست.</strong> عددها تخمین‌اند. هر ردیف را می‌شود بعد از ثبت ویرایش کرد. اگر غذایی مدام اشتباه می‌آید، اسمش را برایمان بفرست.
        </p>
        <p>
          <strong>می‌خواهم حسابم پاک شود.</strong> راهنمایش در صفحه <a href="/delete-account">حذف حساب</a> است.
        </p>
      </section>
      <section>
        <h2>یادآوری مهم</h2>
        <p>Nutivo ابزار ثبت و آگاهی تغذیه است، نه مشاوره پزشکی. اگر بیماری، بارداری یا شرایط خاصی داری، پیش از تغییر رژیم با پزشک یا متخصص تغذیه صحبت کن.</p>
      </section>
    </>
  );
}
