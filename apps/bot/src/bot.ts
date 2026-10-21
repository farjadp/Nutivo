import { toLatinDigits, type DayView, type DraftView, type MealType } from "@nutivo/core";
import { Bot, InlineKeyboard, InputFile, type Context } from "grammy";
import { reportText } from "@nutivo/core";
import type { UserFromGetMe } from "grammy/types";
import type { Api, NakhonakMessage, OnboardProfile } from "./api";
import { COPY, dayCaption, dayCard, draftCard, goalsCard, MEAL, n, short } from "./text";

/** Per-chat state kept on the server (bot_sessions), so the bot process itself is stateless. */
interface Session {
  step?: "goal" | "sex" | "age" | "height" | "weight" | "activity" | "tz";
  answers?: Partial<OnboardProfile>;
  /** Waiting for a number: the weight of one draft item. */
  grams?: { draft: string; idx: number; message: number; name: string };
  /** Repeat ids behind the buttons under the last summary (callback data is limited to 64 bytes). */
  repeats?: string[];
}

export interface BotDeps {
  api: Api;
  /** Downloads a Telegram file (photo) and returns its bytes. */
  download: (fileId: string) => Promise<{ bytes: Buffer; mediaType: "image/jpeg" | "image/png" | "image/webp" } | null>;
  now?: () => Date;
  botInfo?: UserFromGetMe;
}

const MEALS: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

const STEPS = {
  goal: { q: "هدفت چیه؟", buttons: [["کم کردن وزن", "lose"], ["حفظ وزن", "maintain"], ["افزایش وزن", "gain"]] },
  sex: { q: "برای حساب انرژی پایه:", buttons: [["زن", "female"], ["مرد", "male"]] },
  age: { q: "چند سالته؟ فقط عدد بفرست." },
  height: { q: "قدت چند سانتی‌متره؟ مثلاً ۱۷۰" },
  weight: { q: "وزنت چند کیلوئه؟ مثلاً ۷۸" },
  activity: {
    q: "روزهایت معمولاً چقدر فعالی؟",
    buttons: [["پشت میز، کم‌تحرک", "sedentary"], ["کمی فعال", "light"], ["متوسط، ورزش هفته‌ای ۳ بار", "moderate"], ["خیلی فعال", "active"]],
  },
  tz: { q: "کجا زندگی می‌کنی؟ (برای ساعت گزارش شبانه)", buttons: [["تورنتو / مونترال", "America/Toronto"], ["ونکوور", "America/Vancouver"], ["تهران", "Asia/Tehran"], ["اروپا (برلین)", "Europe/Berlin"]] },
} as const;
const ORDER = ["goal", "sex", "age", "height", "weight", "activity", "tz"] as const;
const NUMERIC = { age: [14, 100], height: [120, 230], weight: [35, 300] } as const;

function localISO(d: Date): string {
  // The server stores eaten_at with an offset; the bot runs in UTC, so send UTC and let the API place it in the user's day.
  return d.toISOString().replace("Z", "+00:00");
}

export function nakhonakKeyboard(m: NakhonakMessage): InlineKeyboard | undefined {
  if (!m.keyboard?.length) return undefined;
  const kb = new InlineKeyboard();
  for (const row of m.keyboard) {
    for (const b of row) kb.text(b.text, b.callback_data);
    kb.row();
  }
  return kb;
}

export function draftKeyboard(v: DraftView): InlineKeyboard {
  const kb = new InlineKeyboard();
  v.items.forEach((it) => {
    const label = `${it.food ? "" : "⚠ "}${short(it.food ?? it.said).slice(0, 18)}${it.grams == null && it.food ? " · وزن؟" : ""}`;
    kb.text("−", `de:${v.id}:d:${it.idx}`).text(label, `de:${v.id}:g:${it.idx}`).text("+", `de:${v.id}:i:${it.idx}`).text("✕", `de:${v.id}:r:${it.idx}`).row();
  });
  MEALS.forEach((m) => kb.text(m === v.meal_type ? `• ${MEAL[m]}` : MEAL[m], `dm:${v.id}:${m}`));
  kb.row();
  kb.text(v.ready ? `ثبت ${MEAL[v.meal_type]}` : "اول وزن‌ها", `dc:${v.id}`).text("انصراف", `dx:${v.id}`);
  return kb;
}

function dayKeyboard(d: DayView): InlineKeyboard {
  const kb = new InlineKeyboard();
  d.repeats.slice(0, 4).forEach((r, i) => {
    if (i > 0 && i % 2 === 0) kb.row();
    kb.text(r.label.slice(0, 30), `rp:${i}`);
  });
  return kb;
}

export function createBot(token: string, deps: BotDeps): Bot {
  const bot = new Bot(token, deps.botInfo ? { botInfo: deps.botInfo } : undefined);
  const api = deps.api;
  const now = deps.now ?? (() => new Date());

  const ids = (ctx: Context) => ({ u: ctx.from!, c: ctx.chat!.id });
  const getS = async (ctx: Context): Promise<Session> => {
    const { u, c } = ids(ctx);
    const r = await api.sessionGet(u, c);
    return r.ok ? (r.data as Session) : {};
  };
  const setS = async (ctx: Context, s: Session) => {
    const { u, c } = ids(ctx);
    await api.sessionSet(u, c, s as Record<string, unknown>);
  };

  async function ask(ctx: Context, step: keyof typeof STEPS) {
    const s = STEPS[step];
    if ("buttons" in s) {
      const kb = new InlineKeyboard();
      s.buttons.forEach(([label, value], i) => {
        kb.text(label, `ob:${step}:${value}`);
        if (i < s.buttons.length - 1) kb.row();
      });
      await ctx.reply(s.q, { reply_markup: kb });
    } else await ctx.reply(s.q);
  }

  async function advance(ctx: Context, s: Session) {
    const next = ORDER.find((k) => {
      const key = k === "height" ? "height_cm" : k === "weight" ? "weight_kg" : k === "tz" ? "timezone" : k;
      return s.answers?.[key as keyof OnboardProfile] === undefined;
    });
    if (next) {
      await setS(ctx, { ...s, step: next });
      return ask(ctx, next);
    }
    const { u, c } = ids(ctx);
    const r = await api.onboard(u, c, s.answers as OnboardProfile);
    if (!r.ok) return ctx.reply(r.error);
    await setS(ctx, {});
    await ctx.reply(goalsCard(r.data), { parse_mode: "HTML" });
  }

  /** The day as an image card (brand design), with one-tap repeats underneath. Falls back to text if rendering fails. */
  async function showToday(ctx: Context, prefix?: string) {
    const { u, c } = ids(ctx);
    await ctx.replyWithChatAction("upload_photo").catch(() => undefined);
    const r = await api.todayCard(u, c);
    if (!r.ok) {
      if (r.code === "no_goals") return ctx.reply("اول هدف‌هایت را تعیین کنیم: /start");
      const t = await api.today(u, c);
      return t.ok ? ctx.reply(dayCard(t.data), { parse_mode: "HTML" }) : ctx.reply(r.error);
    }
    const day = r.data.day;
    const s = await getS(ctx);
    await setS(ctx, { ...s, repeats: day.repeats.map((x) => x.id) });
    const kb = dayKeyboard(day);
    if (day.repeats.length) kb.row();
    kb.text("گزارش امروز", `rpt:${day.date}`);
    await ctx.replyWithPhoto(new InputFile(Buffer.from(r.data.png_base64, "base64"), "nutivo-today.png"), {
      caption: `${prefix ? `${prefix}\n\n` : ""}${dayCaption(day)}`,
      parse_mode: "HTML",
      reply_markup: kb,
    });
  }

  async function showReport(ctx: Context, date?: string) {
    const { u, c } = ids(ctx);
    await ctx.replyWithChatAction("typing").catch(() => undefined);
    const r = await api.report(u, c, date);
    if (!r.ok) return ctx.reply(r.code === "no_goals" ? "اول هدف‌هایت را تعیین کنیم: /start" : r.error);
    if (!r.data.facts.logged) return ctx.reply(`برای ${r.data.day_label} چیزی ثبت نشده؛ گزارشی نیست.`);
    await ctx.reply(reportText(r.data), { parse_mode: "HTML" });
  }

  async function startDraft(ctx: Context, body: { text?: string; photo?: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" } }) {
    const { u, c } = ids(ctx);
    const wait = await ctx.reply(body.photo ? COPY.readingPhoto : COPY.reading);
    await ctx.replyWithChatAction("typing").catch(() => undefined);
    const r = await api.draft(u, c, { ...body, now: localISO(now()) });
    if (!r.ok) {
      if (r.code === "no_goals" || r.code === "not_linked") return ctx.api.editMessageText(c, wait.message_id, "اول چند سؤال کوتاه: /start");
      return ctx.api.editMessageText(c, wait.message_id, r.error);
    }
    await ctx.api.editMessageText(c, wait.message_id, draftCard(r.data), { parse_mode: "HTML", reply_markup: draftKeyboard(r.data) });
  }

  // --- commands -------------------------------------------------------------

  bot.command("start", async (ctx) => {
    const { u, c } = ids(ctx);
    const payload = ctx.match?.trim();
    if (payload?.startsWith("link_")) {
      const r = await api.link(u, c, payload.slice(5));
      return ctx.reply(r.ok ? "حساب Nutivo به این چت وصل شد. حالا هر چی اینجا ثبت کنی، در اپ و وب هم دیده می‌شود." : r.error);
    }
    const reg = await api.register(u, c);
    if (!reg.ok) return ctx.reply(reg.error);
    if (reg.data.hasGoals) return showToday(ctx, COPY.welcomeBack);
    await ctx.reply(COPY.welcome(u.first_name));
    await advance(ctx, { answers: {} });
  });

  bot.command("help", (ctx) => ctx.reply(COPY.help, { parse_mode: "HTML" }));
  bot.command("today", (ctx) => showToday(ctx));
  bot.command("report", (ctx) => showReport(ctx));
  bot.command("nakhonak", async (ctx) => {
    const { u, c } = ids(ctx);
    const r = await api.nakhonakToday(u, c);
    if (!r.ok) return ctx.reply(r.code === "no_goals" || r.code === "not_linked" ? "اول هدف‌هایت را تعیین کنیم: /start" : r.error);
    await ctx.reply(r.data.text, { parse_mode: "HTML", reply_markup: nakhonakKeyboard(r.data) });
  });

  bot.command("link", async (ctx) => {
    const { u, c } = ids(ctx);
    const code = ctx.match?.trim();
    if (!code) return ctx.reply("کد را از «من › بات تلگرام» در اپ یا وب بگیر و این‌طور بفرست: /link ABC123");
    const r = await api.link(u, c, code);
    await ctx.reply(r.ok ? "حساب Nutivo به این چت وصل شد." : r.error);
  });

  // --- buttons --------------------------------------------------------------

  bot.callbackQuery(/^ob:(\w+):(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const [, field, value] = ctx.match;
    const s = await getS(ctx);
    const key = field === "tz" ? "timezone" : field;
    await ctx.editMessageReplyMarkup().catch(() => undefined);
    await advance(ctx, { ...s, answers: { ...s.answers, [key as string]: value } });
  });

  bot.callbackQuery(/^de:([0-9a-f-]{36}):([idrg]):(\d+)$/, async (ctx) => {
    const [, id, op, idxS] = ctx.match;
    const idx = Number(idxS);
    const { u, c } = ids(ctx);
    if (op === "g") {
      await ctx.answerCallbackQuery();
      const name = ctx.callbackQuery.message?.reply_markup?.inline_keyboard[idx]?.[1]?.text ?? "";
      const s = await getS(ctx);
      await setS(ctx, { ...s, grams: { draft: id!, idx, message: ctx.callbackQuery.message!.message_id, name } });
      return ctx.reply(COPY.gramsAsk(name.replace(" · وزن؟", "")), { parse_mode: "HTML" });
    }
    const r = await api.draftEdit(u, c, id!, { op: op === "i" ? "inc" : op === "d" ? "dec" : "remove", idx });
    await ctx.answerCallbackQuery(r.ok ? undefined : { text: r.error });
    if (r.ok) await ctx.editMessageText(draftCard(r.data), { parse_mode: "HTML", reply_markup: draftKeyboard(r.data) }).catch(() => undefined);
  });

  bot.callbackQuery(/^dm:([0-9a-f-]{36}):(breakfast|lunch|snack|dinner)$/, async (ctx) => {
    const [, id, meal] = ctx.match;
    const { u, c } = ids(ctx);
    const r = await api.draftEdit(u, c, id!, { op: "meal", meal_type: meal! });
    await ctx.answerCallbackQuery(r.ok ? undefined : { text: r.error });
    if (r.ok) await ctx.editMessageText(draftCard(r.data), { parse_mode: "HTML", reply_markup: draftKeyboard(r.data) }).catch(() => undefined);
  });

  bot.callbackQuery(/^dc:([0-9a-f-]{36})$/, async (ctx) => {
    const { u, c } = ids(ctx);
    const card = ctx.callbackQuery.message;
    const r = await api.draftConfirm(u, c, ctx.match[1]!);
    if (!r.ok) return ctx.answerCallbackQuery({ text: r.error, show_alert: true });
    await ctx.answerCallbackQuery({ text: "ثبت شد" });
    const meal = (card?.reply_markup?.inline_keyboard.flat().find((b) => "callback_data" in b && b.callback_data?.startsWith("dm:") && b.text.startsWith("• "))?.text.slice(2) ?? "") as string;
    await ctx.editMessageText(`✓ ${meal ? `${meal} ` : ""}ثبت شد.${r.data.day ? `\n\n${dayCard(r.data.day)}` : ""}`, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("برگردان", `un:${r.data.entry_id}`),
    });
  });

  bot.callbackQuery(/^dx:([0-9a-f-]{36})$/, async (ctx) => {
    const { u, c } = ids(ctx);
    await api.draftCancel(u, c, ctx.match[1]!);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(COPY.cancelled).catch(() => undefined);
  });

  bot.callbackQuery(/^un:([0-9a-f-]{36})$/, async (ctx) => {
    const { u, c } = ids(ctx);
    const r = await api.undo(u, c, ctx.match[1]!);
    await ctx.answerCallbackQuery(r.ok ? { text: "برگشت" } : { text: r.error, show_alert: true });
    if (r.ok) await ctx.editMessageText(COPY.undone).catch(() => undefined);
  });

  bot.callbackQuery(/^nk:(\d{4}-\d{2}-\d{2}):([a-z]{1,2})$/, async (ctx) => {
    const { u, c } = ids(ctx);
    const r = await api.nakhonakAnswer(u, c, ctx.match[1]!, ctx.match[2]!);
    if (!r.ok) return ctx.answerCallbackQuery({ text: r.error, show_alert: true });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(r.data.text, { parse_mode: "HTML" }).catch(() => ctx.reply(r.data.text, { parse_mode: "HTML" }));
  });

  bot.callbackQuery(/^nko:(on|off)$/, async (ctx) => {
    const { u, c } = ids(ctx);
    const r = await api.nakhonakToggle(u, c, ctx.match[1] === "on");
    if (!r.ok) return ctx.answerCallbackQuery({ text: r.error, show_alert: true });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(r.data.text, { parse_mode: "HTML", reply_markup: nakhonakKeyboard(r.data) });
  });

  bot.callbackQuery(/^rpt:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showReport(ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^rp:(\d)$/, async (ctx) => {
    const { u, c } = ids(ctx);
    const s = await getS(ctx);
    const id = s.repeats?.[Number(ctx.match[1])];
    if (!id) return ctx.answerCallbackQuery({ text: "این پیشنهاد قدیمی شده؛ /today را بزن." });
    const r = await api.repeat(u, c, id, localISO(now()));
    if (!r.ok) return ctx.answerCallbackQuery({ text: r.error, show_alert: true });
    await ctx.answerCallbackQuery({ text: "ثبت شد" });
    await ctx.reply(`✓ ${r.data.label} ثبت شد.${r.data.day ? `\n\n${dayCard(r.data.day)}` : ""}`, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("برگردان", `un:${r.data.entry_id}`),
    });
  });

  // --- messages -------------------------------------------------------------

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) return ctx.reply(COPY.help, { parse_mode: "HTML" });
    const s = await getS(ctx);
    const num = Number(toLatinDigits(text).replace(/[^\d.]/g, ""));

    if (s.grams) {
      if (!(num >= 1 && num <= 2000)) return ctx.reply(COPY.gramsBad);
      const { u, c } = ids(ctx);
      const g = s.grams;
      await setS(ctx, { ...s, grams: undefined });
      const r = await api.draftEdit(u, c, g.draft, { op: "grams", idx: g.idx, grams: num });
      if (!r.ok) return ctx.reply(r.error);
      await ctx.api.editMessageText(c, g.message, draftCard(r.data), { parse_mode: "HTML", reply_markup: draftKeyboard(r.data) }).catch(() => undefined);
      return ctx.reply(`وزن ${n(num)} گرم ثبت شد. کارت بالا به‌روز شد.`);
    }

    if (s.step && s.step in NUMERIC) {
      const [min, max] = NUMERIC[s.step as keyof typeof NUMERIC];
      if (!(num >= min && num <= max)) return ctx.reply(`یک عدد بین ${n(min)} تا ${n(max)} بفرست.`);
      const key = s.step === "height" ? "height_cm" : s.step === "weight" ? "weight_kg" : "age";
      return advance(ctx, { ...s, answers: { ...s.answers, [key]: s.step === "age" ? Math.round(num) : num } });
    }
    if (s.step) return ask(ctx, s.step);
    return startDraft(ctx, { text });
  });

  bot.on("message:photo", async (ctx) => {
    const sizes = ctx.message.photo;
    // Largest size up to ~1600px is plenty for recognition and keeps uploads small.
    const pick = [...sizes].reverse().find((p) => Math.max(p.width, p.height) <= 1600) ?? sizes[sizes.length - 1]!;
    const file = await deps.download(pick.file_id);
    if (!file) return ctx.reply("نتوانستم عکس را از تلگرام بگیرم. دوباره بفرست.");
    await startDraft(ctx, { text: ctx.message.caption ?? undefined, photo: { base64: file.bytes.toString("base64"), mediaType: file.mediaType } });
  });

  bot.on("message", (ctx) => ctx.reply("فعلاً متن و عکس را می‌فهمم. بنویس چی خوردی یا عکس بفرست."));

  bot.catch((err) => {
    console.error("[bot] handler error", err.error);
  });

  return bot;
}
