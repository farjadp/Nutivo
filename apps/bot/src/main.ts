import { createApi } from "./api";
import { createBot } from "./bot";

const token = process.env.TELEGRAM_BOT_TOKEN;
const baseUrl = process.env.NUTIVO_API_URL ?? "http://localhost:3000";
const secret = process.env.NUTIVO_BOT_SECRET;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set (BotFather → /newbot). See apps/bot/.env.example.");
  process.exit(1);
}
if (!secret || secret.length < 32) {
  console.error("NUTIVO_BOT_SECRET must match apps/web/.env.local (≥ 32 chars).");
  process.exit(1);
}

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
  { command: "today", description: "خلاصه امروز" },
  { command: "help", description: "راهنما" },
  { command: "link", description: "وصل‌کردن به حساب وب" },
]);
console.info("[bot] long polling…");
bot.start({ onStart: (me) => console.info(`[bot] @${me.username} ready`) });
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
