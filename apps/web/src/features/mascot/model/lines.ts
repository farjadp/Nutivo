/**
 * نوتی's lines. Colloquial Persian, a mischievous seven-year-old's voice.
 * Rules (docs/MASCOT.md): no weight/body talk, no guilt, no medical advice, no emoji,
 * numbers only via {placeholders} filled from the calculation engine.
 */
import type { NutiMood } from "../ui/nuti";

export type NutiSituation =
  | "empty"
  | "night"
  | "chewing"
  | "logged"
  | "photo"
  | "proteinLow"
  | "onTrack"
  | "streak"
  | "over"
  | "complete"
  | "question"
  | "error";

const LINES: Record<NutiSituation, { mood: NutiMood; say: string[] }> = {
  empty: {
    mood: "happy",
    say: [
      "سلااام! من نوتی‌ام. امروز هنوز هیچی نخوردی؟ من که از صبح سه تا خیال‌پلو خوردم!",
      "شکمت داره قار و قور می‌کنه یا من اشتباه شنیدم؟ اولین وعده رو بگو!",
      "بگو چی خوردی، بقیه‌ش با من. ریاضیم بیسته!",
      "دفترم خالیه و من حوصله‌م سر رفته. یه غذا بده بنویسم!",
    ],
  },
  night: {
    mood: "sleepy",
    say: ["دیروقته‌ها… من که دارم چرت می‌زنم. فردا صبح منتظرتم!", "شب بخیر! امروز رو بستم، فقط اگه چیزی جا افتاده بگو."],
  },
  chewing: {
    mood: "chew",
    say: ["دارم می‌جوم… یعنی دارم می‌خونمش!", "صبر کن ببینم… این قورمه‌ست یا من گشنمه؟", "دارم کالری‌ها رو یکی‌یکی می‌شمرم… یک، دو، خیلی!"],
  },
  logged: {
    mood: "wink",
    say: ["تیک! رفت توی دفترم.", "ثبتش کردم! خوشمزه بود؟ برای منم نگه داشتی؟", "آفرین! حلقه‌هه رو ببین چه ذوقی کرد!"],
  },
  photo: {
    mood: "wow",
    say: ["عجب عکسی! از غذات عکس گرفتی یا از یه نقاشی؟", "واای، دهنم آب افتاد! مقدارها رو با چشم حدس زدم، یه نگاه بنداز."],
  },
  proteinLow: {
    mood: "think",
    say: [
      "پروتئینت یه کم تنهاست! هنوز {protein} گرم مونده. یه تخم‌مرغ یا ماست بهش رفیق بده.",
      "{protein} گرم پروتئین تا هدف مونده. جوجه‌کباب داره صدات می‌کنه!",
      "عضله‌هات گفتن سلام، پروتئین بیشتر! حدود {protein} گرم دیگه.",
    ],
  },
  onTrack: {
    mood: "happy",
    say: [
      "داری عالی پیش میری! من جای تو بودم یه بشکن می‌زدم.",
      "{kcal} کالری جا داری. بگو شام چی می‌خوای، با هم نقشه می‌کشیم!",
      "همه‌چی سر جاشه. من حتی یه کم حسودیم شد!",
    ],
  },
  streak: {
    mood: "wow",
    say: ["{streak} روز پشت‌سرهم! تو از من هم منظم‌تری، من که مسواکم یادم میره!", "{streak} روزه داری ثبت می‌کنی! یه مدال شکلاتی… نه ببخشید، یه مدال پروتئینی بهت میدم!"],
  },
  over: {
    mood: "happy",
    say: [
      "امروز یه کم بیشتر شد، اشکال نداره! یه روز که حساب نیست، کل هفته مهمه.",
      "حدود {over} کالری بیشتر از هدف. فردا با هم یه روز سبک‌تر می‌سازیم، قول!",
    ],
  },
  complete: {
    mood: "cheer",
    say: ["روز کامل! رقص پیروزی!", "واااای! امروز همه‌چی سر جاش بود. من یه چرخ زدم!", "تو امروز قهرمانی! کالری، پروتئین، همه تیک!"],
  },
  question: { mood: "think", say: ["یه سؤال کوچولو دارم! جوابش رو بدی دقیق‌تر حساب می‌کنم."] },
  error: { mood: "wow", say: ["اوه اوه! یه چیزی گیر کرد. یه بار دیگه امتحان کن؟"] },
};

/** Stable pick: same situation + seed → same line (no flicker on re-render). */
export function nutiSay(situation: NutiSituation, vars: Record<string, string> = {}, seed = 0): { mood: NutiMood; text: string } {
  const set = LINES[situation];
  const raw = set.say[Math.abs(seed) % set.say.length]!;
  const text = raw.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
  return { mood: set.mood, text };
}

export function daySeed(isoDate: string, salt = 0): number {
  let h = salt;
  for (const ch of isoDate) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}
