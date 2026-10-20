import "server-only";
import { getSecret, getSetting, SETTING_KEYS } from "@/lib/server/settings";

/** Minimal Telegram Bot API client for pushes from the web app (nightly report). The bot process handles chats. */
export const TELEGRAM_TOKEN_RE = /^\d{5,}:[\w-]{30,}$/;

/** Token from the admin panel, else TELEGRAM_BOT_TOKEN. */
export async function telegramToken(): Promise<string | null> {
  const t = (await getSecret(SETTING_KEYS.telegramToken, "TELEGRAM_BOT_TOKEN")) ?? "";
  return TELEGRAM_TOKEN_RE.test(t) ? t : null;
}

/** Bot username without @ (admin panel, else NUTIVO_TELEGRAM_BOT_USERNAME). */
export async function telegramUsername(): Promise<string | null> {
  const u = await getSetting<string | null>(SETTING_KEYS.telegramUsername, null);
  return (u ?? process.env.NUTIVO_TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "") || null;
}

/** Checks a token with Telegram. Returns the bot's username, or an error message. */
export async function getMe(token: string): Promise<{ ok: true; username: string; name: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(8000) });
    const j = (await res.json()) as { ok: boolean; result?: { username: string; first_name: string }; description?: string };
    return j.ok && j.result ? { ok: true, username: j.result.username, name: j.result.first_name } : { ok: false, error: j.description ?? `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

type Keyboard = { inline_keyboard: { text: string; callback_data?: string; url?: string }[][] };

async function call(method: string, body: FormData | Record<string, unknown>): Promise<{ ok: boolean; description?: string }> {
  const token = await telegramToken();
  if (!token) return { ok: false, description: "Telegram bot token not set" };
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    ...(body instanceof FormData ? { body } : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  });
  return (await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }))) as { ok: boolean; description?: string };
}

export async function sendPhoto(chatId: number, png: Buffer, caption: string, keyboard?: Keyboard) {
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("caption", caption);
  form.set("parse_mode", "HTML");
  if (keyboard) form.set("reply_markup", JSON.stringify(keyboard));
  form.set("photo", new Blob([new Uint8Array(png)], { type: "image/png" }), "nutivo-day.png");
  return call("sendPhoto", form);
}

export async function sendMessage(chatId: number, text: string, keyboard?: Keyboard) {
  return call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...(keyboard ? { reply_markup: keyboard } : {}) });
}
