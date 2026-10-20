import "server-only";

/** Minimal Telegram Bot API client for pushes from the web app (nightly report). The bot process handles chats. */
export function telegramToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN ?? "";
  return /^\d+:[\w-]{30,}$/.test(t) ? t : null;
}

type Keyboard = { inline_keyboard: { text: string; callback_data?: string; url?: string }[][] };

async function call(method: string, body: FormData | Record<string, unknown>): Promise<{ ok: boolean; description?: string }> {
  const token = telegramToken();
  if (!token) return { ok: false, description: "TELEGRAM_BOT_TOKEN not set" };
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
