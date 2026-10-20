import { createApi } from "./api";
import { createBot } from "./bot";

const baseUrl = process.env.NUTIVO_API_URL ?? "http://localhost:3000";
const secret = process.env.NUTIVO_BOT_SECRET;

if (!secret || secret.length < 32) {
  console.error("NUTIVO_BOT_SECRET must match apps/web/.env.local (≥ 32 chars).");
  process.exit(1);
}

/**
 * Token from TELEGRAM_BOT_TOKEN, else from the web app (admin panel → تنظیمات → بات تلگرام).
 * Waits and retries every 10 s, so saving the token in the panel is enough to bring the bot up.
 */
async function resolveToken(): Promise<string> {
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN;
  let said = "";
  for (;;) {
    let msg: string;
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/bot/config`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
      const j = (await res.json()) as { ok: boolean; data?: { token: string; username: string | null }; error?: string };
      if (j.ok && j.data?.token) return j.data.token;
      msg = res.status === 401 ? "NUTIVO_BOT_SECRET با apps/web/.env.local یکی نیست." : `${j.error ?? `HTTP ${res.status}`} منتظرم… (هر ۱۰ ثانیه دوباره چک می‌کنم)`;
    } catch {
      msg = `وب‌اپ روی ${baseUrl} در دسترس نیست. pnpm dev را اجرا کن؛ منتظرم…`;
    }
    if (msg !== said) console.info(`[bot] ${msg}`);
    said = msg;
    await new Promise((r) => setTimeout(r, 10_000));
  }
}

const token = await resolveToken();

const api = createApi({ baseUrl, secret });
const bot = createBot(token, {
  api,
  async download(fileId) {
    const f = await bot.api.getFile(fileId);
    if (!f.file_path) return null;
    const res = await fetch(`https://api.telegram.org/file/bot${token}/${f.file_path}`);
    if (!res.ok) return null;
    const ext = f.file_path.split(".").pop()?.toLowerCase();
    return { bytes: Buffer.from(await res.arrayBuffer()), mediaType: ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg" };
  },
});

await bot.api.setMyCommands([
  { command: "today", description: "کارت امروز" },
  { command: "report", description: "گزارش امروز" },
  { command: "help", description: "راهنما" },
  { command: "link", description: "وصل‌کردن به حساب وب" },
]);
console.info("[bot] long polling…");
bot.start({ onStart: (me) => console.info(`[bot] @${me.username} ready`) });
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
