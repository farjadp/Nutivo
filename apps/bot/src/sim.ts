/**
 * Telegram simulator: drives the real bot against the real web API without Telegram.
 * Outgoing Bot API calls are intercepted and printed; incoming updates are fabricated.
 * Usage: pnpm --filter @nutivo/bot sim   (needs the web app running and NUTIVO_BOT_SECRET in apps/bot/.env)
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Update } from "grammy/types";
import { createApi } from "./api";
import { createBot } from "./bot";

const secret = process.env.NUTIVO_BOT_SECRET ?? "";
const baseUrl = process.env.NUTIVO_API_URL ?? "http://localhost:3000";
const TG_ID = Number(process.env.SIM_TELEGRAM_ID ?? 900000 + Math.floor(Math.random() * 99999));
const PHOTO = process.env.SIM_PHOTO ?? "zereshk-polo-morgh";

type Btn = { text: string; callback_data?: string };
interface Msg { id: number; text: string; buttons: Btn[][] }
const chat = new Map<number, Msg>();
let nextId = 100;
let updateId = 1;
const log: string[] = [];

const bot = createBot("000:SIMULATED", {
  api: createApi({ baseUrl, secret }),
  botInfo: { id: 1, is_bot: true, first_name: "Nutivo", username: "nutivo_sim_bot", can_join_groups: false, can_read_all_group_messages: false, supports_inline_queries: false, can_connect_to_business: false, has_main_web_app: false, has_topics_enabled: false, allows_users_to_create_topics: false, can_manage_bots: false, supports_join_request_queries: false },
  download: async () => ({ bytes: await readFile(path.resolve(process.cwd(), "../../tests/photos", `${PHOTO}.jpg`)), mediaType: "image/jpeg" }),
});

bot.api.config.use(async (_prev, method, payload) => {
  const p = payload as Record<string, unknown>;
  const buttons = ((p.reply_markup as { inline_keyboard?: Btn[][] } | undefined)?.inline_keyboard ?? []) as Btn[][];
  const show = (m: Msg, verb: string) =>
    log.push(`${verb} #${m.id}\n${m.text.replace(/<[^>]+>/g, "")}${m.buttons.length ? "\n  [" + m.buttons.map((r) => r.map((b) => b.text).join(" | ")).join("]\n  [") + "]" : ""}\n`);
  if (method === "sendMessage") {
    const m = { id: nextId++, text: String(p.text), buttons };
    chat.set(m.id, m);
    show(m, "BOT ←");
    return { ok: true, result: { message_id: m.id, date: 0, chat: { id: TG_ID, type: "private" }, text: m.text, reply_markup: { inline_keyboard: buttons } } } as never;
  }
  if (method === "editMessageText") {
    const m = chat.get(Number(p.message_id)) ?? { id: Number(p.message_id), text: "", buttons: [] };
    m.text = String(p.text);
    m.buttons = buttons;
    chat.set(m.id, m);
    show(m, "BOT ✎");
    return { ok: true, result: true } as never;
  }
  if (method === "editMessageReplyMarkup") {
    const m = chat.get(Number(p.message_id));
    if (m) m.buttons = buttons;
    return { ok: true, result: true } as never;
  }
  if (method === "answerCallbackQuery") {
    if (p.text) log.push(`BOT (toast) ${String(p.text)}\n`);
    return { ok: true, result: true } as never;
  }
  return { ok: true, result: true } as never;
});

const from = { id: TG_ID, is_bot: false, first_name: "فرجاد", username: "sim_user", language_code: "fa" };
const chatObj = { id: TG_ID, type: "private" as const, first_name: "فرجاد" };

async function send(text: string) {
  log.push(`USER → ${text}\n`);
  const entities = text.startsWith("/") ? [{ type: "bot_command" as const, offset: 0, length: text.split(" ")[0]!.length }] : undefined;
  await bot.handleUpdate({ update_id: updateId++, message: { message_id: nextId++, date: Math.floor(Date.now() / 1000), chat: chatObj, from, text, entities } } as Update);
}
async function photo(caption?: string) {
  log.push(`USER → [photo ${PHOTO}]${caption ? ` «${caption}»` : ""}\n`);
  await bot.handleUpdate({
    update_id: updateId++,
    message: { message_id: nextId++, date: Math.floor(Date.now() / 1000), chat: chatObj, from, caption, photo: [{ file_id: "sim", file_unique_id: "sim", width: 1280, height: 960 }] },
  } as Update);
}
/** Taps the first button whose label or data matches. */
async function tap(match: RegExp | string) {
  for (const m of [...chat.values()].reverse()) {
    const b = m.buttons.flat().find((x) => (typeof match === "string" ? x.text === match || x.callback_data?.startsWith(match) : match.test(x.text)));
    if (!b?.callback_data) continue;
    log.push(`USER ⊙ ${b.text}\n`);
    await bot.handleUpdate({
      update_id: updateId++,
      callback_query: { id: String(updateId), from, chat_instance: "sim", data: b.callback_data, message: { message_id: m.id, date: 0, chat: chatObj, text: m.text, reply_markup: { inline_keyboard: m.buttons } } },
    } as Update);
    return;
  }
  throw new Error(`no button ${match}`);
}

const script = process.argv[2] ?? "full";
if (script === "full") {
  await send("/start");
  await tap("کم کردن وزن");
  await tap("مرد");
  await send("۳۴");
  await send("۱۷۸");
  await send("۸۲");
  await tap("کمی فعال");
  await tap("تورنتو / مونترال");
  await send("ناهار دو کفگیر برنج و یه سیخ جوجه کباب و یه لیوان دوغ");
  await tap("+");
  await tap(/^شام$/);
  await tap(/^ثبت /);
  await tap("برگردان");
  await photo();
  await tap(/^ثبت |^اول وزن/);
  await tap(/وزن؟$/);
  await send("۱۵۰");
  await tap(/^ثبت /);
  await send("/today");
}
console.log(log.join("\n"));
