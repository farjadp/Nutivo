import { toPersianDigits, type AppNakhonakToday } from "@nutivo/core";

/** ناخنک in Telegram: HTML text plus the inline keyboard (callback data `nk:<date>:<choice>`). */

export interface TelegramMessage {
  text: string;
  keyboard: { text: string; callback_data: string }[][] | null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function nakhonakTelegram(t: AppNakhonakToday): TelegramMessage {
  const head = "<b>ناخنک</b>";
  if (t.kind === "truce" || t.kind === "paused" || !t.story) return { text: `${head}\n\n${esc(t.text ?? "")}`, keyboard: null };

  const story = `${head} · <i>${esc(t.story.title)}</i>\n\n${t.intro ? `${esc(t.intro)}\n\n` : ""}${esc(t.story.text)}`;
  if (!t.result) {
    const rows = t.story.choices.map((c) => [{ text: c.label, callback_data: `nk:${t.date}:${c.id}` }]);
    if (t.story.skipLabel) rows.push([{ text: t.story.skipLabel, callback_data: `nk:${t.date}:x` }]);
    return { text: story, keyboard: rows };
  }

  const r = t.result;
  const picked = r.outcome === "skip" ? t.story.skipLabel : t.story.choices.find((c) => c.id === r.choice)?.label;
  const parts = [`${head} · <i>${esc(t.story.title)}</i>`];
  if (picked) parts.push(`«${esc(picked)}»`);
  if (r.nuti) parts.push(`<b>نوتی:</b> ${esc(r.nuti)}`);
  parts.push(`<b>ناخنک:</b> ${esc(r.reply)}`);
  if (r.extra) parts.push(esc(r.extra));
  if (r.logPrompt) parts.push("<i>هر وقت خواستی، همین‌جا بنویس چی خوردی تا ثبتش کنم.</i>");
  for (const l of t.aside ?? []) parts.push(`<b>${l.who === "nuti" ? "نوتی" : "ناخنک"}:</b> ${esc(l.text)}`);
  if (r.points > 0) parts.push(`+${toPersianDigits(r.points)} امتیاز`);
  return { text: parts.join("\n\n"), keyboard: null };
}
