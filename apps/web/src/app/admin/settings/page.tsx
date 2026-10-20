import { CheckCircle2, CircleAlert } from "lucide-react";
import { requireAdmin } from "@/features/admin/api/guard.server";
import { PageHeader, Panel } from "@/features/admin/ui/bits";
import { ProviderCard, TelegramCard, ValueField, type ProviderView, type TelegramView } from "@/features/admin/ui/settings-forms";
import { faAgo } from "@/shared/lib/format";
import { canEncrypt, last4 } from "@/lib/server/secrets";
import { listSettingsMasked, SETTING_KEYS } from "@/lib/server/settings";
import { adminClient } from "@/lib/supabase/admin";
import { isAuthDisabled, isFigfitEnabled } from "@/shared/config";

export default async function SettingsPage() {
  const ctx = await requireAdmin();
  const rows = ctx.live ? await listSettingsMasked() : [];
  const get = (k: string) => rows.find((r) => r.key === k);

  const provider = (id: ProviderView["id"], name: string, secretKey: string, envName: string, use: string, placeholder: string, docs: string): ProviderView => {
    const r = get(secretKey);
    const env = process.env[envName];
    return {
      id,
      name,
      use,
      secretKey,
      source: r?.hasSecret ? "panel" : env ? "env" : "none",
      last4: r?.hasSecret ? r.last4 : env ? last4(env) : null,
      updatedAt: r?.updated_at ?? null,
      placeholder,
      docs,
    };
  };

  const providers: ProviderView[] = [
    provider("anthropic", "Anthropic (Claude)", SETTING_KEYS.anthropicKey, "ANTHROPIC_API_KEY", "خواندن وعده از متن و عکس، گزارش شبانه و «بپرس». اصلی‌ترین کلید.", "sk-ant-…", "https://console.anthropic.com/settings/keys"),
    provider("openai", "OpenAI", SETTING_KEYS.openaiKey, "OPENAI_API_KEY", "برای تبدیل صدا به متن (ثبت صوتی، نسخه ۱.۵). فعلاً اختیاری.", "sk-…", "https://platform.openai.com/api-keys"),
    provider("google", "Google Gemini", SETTING_KEYS.googleKey, "GOOGLE_API_KEY", "پشتیبان یا مقایسه کیفیت تشخیص عکس. فعلاً اختیاری.", "AIza…", "https://aistudio.google.com/apikey"),
  ];

  const tgRow = get(SETTING_KEYS.telegramToken);
  const tgEnv = process.env.TELEGRAM_BOT_TOKEN;
  const telegram: TelegramView = {
    source: tgRow?.hasSecret ? "panel" : tgEnv ? "env" : "none",
    last4: tgRow?.hasSecret ? tgRow.last4 : tgEnv ? last4(tgEnv) : null,
    username: (get(SETTING_KEYS.telegramUsername)?.value as string | undefined) ?? process.env.NUTIVO_TELEGRAM_BOT_USERNAME ?? null,
    linkedUsers: 0,
    lastSeen: null,
  };
  if (ctx.live) {
    const [{ count }, { data: seen }] = await Promise.all([
      adminClient().from("telegram_links").select("telegram_id", { count: "exact", head: true }),
      adminClient().from("telegram_links").select("last_seen_at").order("last_seen_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    telegram.linkedUsers = count ?? 0;
    telegram.lastSeen = (seen?.last_seen_at as string | undefined) ?? null;
  }

  let figfitRows: number | null = null;
  if (ctx.live) {
    const { count } = await adminClient().from("foods").select("id", { count: "exact", head: true }).eq("source", "figfit");
    figfitRows = count ?? 0;
  }

  const value = (k: string, fallback: string) => String(get(k)?.value ?? fallback);
  const health = [
    { ok: ctx.live, label: "کلید service role سوپابیس", hint: "لازم برای کاربران، لاگ و ذخیره تنظیمات" },
    { ok: canEncrypt(), label: "کلید رمزنگاری NUTIVO_SECRETS_KEY", hint: "کلیدهای API با آن رمز می‌شوند" },
    { ok: providers[0]!.source !== "none", label: "کلید Claude", hint: "بدون آن ثبت وعده کار نمی‌کند" },
  ];

  return (
    <>
      <PageHeader title="تنظیمات" sub="کلیدهای API و تنظیمات سرویس. کلیدهای ذخیره‌شده رمز می‌شوند و هرگز دوباره نمایش داده نمی‌شوند." />

      <Panel title="وضعیت" className="mb-4">
        <ul className="grid gap-2 md:grid-cols-3">
          {health.map((h) => (
            <li key={h.label} className="flex items-start gap-2">
              {h.ok ? <CheckCircle2 size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-success" aria-label="فعال" /> : <CircleAlert size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-fat-ink" aria-label="تنظیم نشده" />}
              <span>
                <span className="block text-sm font-semibold">{h.label}</span>
                <span className="block text-xs text-ink-2">{h.hint}</span>
              </span>
            </li>
          ))}
        </ul>
        {isAuthDisabled() && <p className="mt-3 text-xs text-ink-2">حالت بررسی بدون ورود روشن است (فقط محیط توسعه).</p>}
      </Panel>

      <h2 className="mb-3 text-lg font-semibold">سرویس‌های هوش مصنوعی</h2>
      <div className="grid gap-4 xl:grid-cols-3">
        {providers.map((p) => <ProviderCard key={p.id} p={p} live={ctx.live} />)}
      </div>
      <p className="mt-2 text-xs text-ink-2">ترتیب استفاده: کلید ذخیره‌شده در پنل، سپس متغیر محیطی. حذف کلید از پنل، اپ را به کلید env برمی‌گرداند.</p>

      <h2 className="mb-3 mt-6 text-lg font-semibold">کانال‌ها</h2>
      <div className="grid gap-4 xl:grid-cols-2">
        <TelegramCard t={telegram} live={ctx.live} lastSeenLabel={telegram.lastSeen ? faAgo(telegram.lastSeen) : "—"} />
      </div>

      <h2 className="mb-3 mt-6 text-lg font-semibold">منابع داده غذا</h2>
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold"><span dir="ltr" className="font-[family-name:var(--font-en)]">FigFit food database</span></p>
            <p className="mt-1 text-xs leading-6 text-ink-2">
              حدود ۱۱ هزار غذای فارسی با واحدهای محلی. مجوز <span dir="ltr">CC BY-NC-SA 4.0</span>: فقط استفاده غیرتجاری. روی این سیستم فقط برای استفاده شخصی و لوکال فعال است و در نسخه production همیشه خاموش است. غذاهای بازبینی‌شده خودمان در جست‌وجو همیشه جلوترند. حذف کامل: <code dir="ltr">pnpm db:figfit --remove</code>
            </p>
          </div>
          <div className="text-left text-xs">
            <p className={isFigfitEnabled() ? "font-semibold text-success" : "font-semibold text-ink-2"}>{isFigfitEnabled() ? "در جست‌وجو فعال" : "در جست‌وجو خاموش"}</p>
            <p className="tabular mt-1 text-ink-2">{figfitRows === null ? "—" : `${figfitRows.toLocaleString("fa-IR")} ردیف بارگذاری‌شده`}</p>
          </div>
        </div>
      </Panel>

      <h2 className="mb-3 mt-6 text-lg font-semibold">مدل‌ها و زمان‌بندی</h2>
      <Panel>
        <div className="grid gap-5 md:grid-cols-2">
          <ValueField live={ctx.live} settingKey={SETTING_KEYS.anthropicExtractModel} label="مدل خواندن وعده" hint="برای متن و عکس. پیش‌فرض: claude-sonnet-5-5" initial={value(SETTING_KEYS.anthropicExtractModel, process.env.NUTIVO_EXTRACT_MODEL || "claude-sonnet-5-5")} />
          <ValueField live={ctx.live} settingKey={SETTING_KEYS.anthropicReportModel} label="مدل گزارش شبانه" hint="متن تحلیل گزارش. پیش‌فرض: claude-sonnet-5-5" initial={value(SETTING_KEYS.anthropicReportModel, process.env.NUTIVO_REPORT_MODEL || "claude-sonnet-5-5")} />
          <ValueField live={ctx.live} settingKey={SETTING_KEYS.openaiTranscribeModel} label="مدل تبدیل صدا (OpenAI)" hint="برای ثبت صوتی. مثلاً whisper-1" initial={value(SETTING_KEYS.openaiTranscribeModel, "whisper-1")} />
          <ValueField live={ctx.live} inputMode="numeric" settingKey={SETTING_KEYS.reportHour} label="ساعت گزارش شبانه" hint="به وقت محلی هر کاربر، ۰ تا ۲۳." initial={value(SETTING_KEYS.reportHour, process.env.NUTIVO_REPORT_HOUR_LOCAL || "21")} />
        </div>
      </Panel>
    </>
  );
}
