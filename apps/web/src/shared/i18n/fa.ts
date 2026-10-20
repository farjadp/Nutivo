/** UI strings. Keep keys English, values Persian. Phase 2 adds en.ts with the same keys. */
export const fa = {
  app: { name: "Nutivo" },
  nav: { today: "امروز", report: "گزارش", ask: "بپرس", me: "من" },
  meals: { breakfast: "صبحانه", lunch: "ناهار", snack: "میان‌وعده", dinner: "شام" },
  macros: { kcal: "کالری", protein: "پروتئین", carbs: "کربوهیدرات", fat: "چربی" },
  log: {
    placeholder: "چی خوردی؟",
    photo: "عکس بگیر",
    quick: "تکراری‌ها",
    confirm: "ثبت",
    edit: "ویرایش مقدارها",
    oneQuestion: "یک سؤال",
  },
  units: { g: "گرم", kcal: "کیلوکالری" },
  streak: { days: "روز پشت‌سرهم", forgiven: "یک روز مرخصی این هفته استفاده شد" },
  report: { title: "گزارش تغذیه روزانه", partial: "تخمینی", inRange: "در محدوده", low: "کم", high: "زیاد" },
  errors: {
    generic: "یک مشکلی پیش آمد. دوباره تلاش کن.",
    missingEnv: "تنظیمات سرور کامل نیست.",
  },
} as const;

export type Dict = typeof fa;
