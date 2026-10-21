/**
 * ناخنک, «عیارِ هزار و یک بهونه»: the opt-in trickster of «حالت شیطان».
 * Character bible: Notion «شناسنامه‌ی شخصیت ناخنک». Rules enforced by nakhonak.test.ts:
 * - Every trap is a thinking error, never hunger or the wish to eat. A conscious choice to eat wins.
 * - No weight/body words, no emoji, no Latin digits, no shaming, no real or sacred people.
 * - A "fall" that leads towards going hungry is taken back on the spot (`retract`).
 * - Even when he wins, he asks for honest logging.
 */

/** Faces drawn in apps/mobile/src/ui/nakhonak.tsx. */
export type NakhonakMood = "sly" | "telling" | "smug" | "beaten" | "gentle" | "truce";

export type TrapId = "brokenDay" | "compensate" | "allOrNothing" | "tomorrow" | "unlogged" | "skipReport" | "mindless";

/** When a story fits the user's day. Picked by the engine in this order of priority. */
export type Moment = "morningAfterOver" | "overToday" | "lateUnlogged" | "eveningLight" | "reportReady" | "any";

/**
 * fall: believed the story. spot: named the flaw. feeling: answered with an honest feeling.
 * ask: asked نوتی. skip: «امروز نه», no game today.
 */
export type Outcome = "fall" | "spot" | "feeling" | "ask" | "skip";

export interface Choice {
  id: "a" | "b" | "c";
  label: string;
  outcome: Exclude<Outcome, "skip">;
  reply: string;
  /** What نوتی says when the user asks her. */
  nuti?: string;
  /** This fall points towards going hungry: ناخنک takes the story back and the round is a draw. */
  retract?: boolean;
  /** Show the quick «ثبت کن» button under the reply. */
  logPrompt?: boolean;
}

export interface Story {
  id: string;
  title: string;
  trap: TrapId;
  form: "hekayat" | "hakim" | "memory" | "riddle";
  moments: Moment[];
  text: string;
  choices: [Choice, Choice, Choice];
}

export interface Trap {
  id: TrapId;
  name: string;
  /** Shown in «پرونده‌ی ناخنک» once the user has spotted it. Plain, kind, factual. */
  explain: string;
}

export const TRAPS: Record<TrapId, Trap> = {
  brokenDay: {
    id: "brokenDay",
    name: "امروز که خراب شد",
    explain: "یه وعده‌ی سنگین کل روز یا هفته رو خراب نمی‌کنه. فکرِ «حالا که خراب شد» معمولاً بیشتر از خود اون وعده اثر داره.",
  },
  compensate: {
    id: "compensate",
    name: "جبران افراطی",
    explain: "گرسنگی کشیدن بعد از یه روز پر، معمولاً به یه گرسنگی بزرگ‌تر ختم می‌شه. روز بعد رو معمولی بخور.",
  },
  allOrNothing: {
    id: "allOrNothing",
    name: "یا هیچی یا همه‌چی",
    explain: "بین هیچی و همه‌چی یه غذای معمولی هست. بیشتر وقت‌ها جواب درست همونه.",
  },
  tomorrow: {
    id: "tomorrow",
    name: "از فردا",
    explain: "شروع کردن لازم نیست منتظر فردا یا شنبه بمونه. وعده‌ی بعدی خودش یه شروع کامله.",
  },
  unlogged: {
    id: "unlogged",
    name: "ثبتش نکن",
    explain: "چیزی که ثبت نشه هم خورده شده. ثبت صادقانه فقط تصویر رو راست نگه می‌داره، قضاوت نمی‌کنه.",
  },
  skipReport: {
    id: "skipReport",
    name: "گزارش رو نبین",
    explain: "گزارش نمره نیست، یه نگاهه. ندیدنش چیزی رو عوض نمی‌کنه، فقط نمی‌ذاره ببینی.",
  },
  mindless: {
    id: "mindless",
    name: "بی‌حواس خوردن",
    explain: "وقتی حواست جای دیگه‌ست، سیر شدن رو دیرتر می‌فهمی. کشیدن توی ظرف یه مکث کوچیکه، نه یه ممنوعیت.",
  },
};

const ASK = "از نوتی بپرسم.";

export const STORIES: Story[] = [
  {
    id: "kuzegar",
    title: "کوزه‌گر",
    trap: "brokenDay",
    form: "hekayat",
    moments: ["overToday"],
    text: "آورده‌اند که کوزه‌گری کوزه‌ای ساخت و لبه‌ش یه ذره پرید. کوزه‌گر نگاهش کرد، گفت این که خراب شد، و کل دکونش رو با چکش خرد کرد. عاقل بود، نه؟ تو هم که امروزت پرید... شام رو هم بزن، فردا رو هم، اصلاً این هفته رو بی‌خیال.",
    choices: [
      { id: "a", label: "راست می‌گی، امروز که رفت.", outcome: "fall", reply: "هه. می‌دونستم. ... ولی محض اطلاع، کوزه‌گره فرداش هیچی برای فروش نداشت. حالا هر چی خوردی ثبتش کن، قصه باید یه جایی نوشته بشه.", logPrompt: true },
      { id: "b", label: "یه لبه‌ی پریده دلیل خرد کردن کل دکون نیست. شام رو معمولی می‌خورم.", outcome: "spot", reply: "تو قصه‌های منو زیادی دقیق گوش می‌دی. این خطرناکه. ... برای من." },
      { id: "c", label: ASK, outcome: "ask", nuti: "یه وعده‌ی سنگین، روند هفته رو عوض نمی‌کنه. شامِ معمولی بخور، همین.", reply: "همیشه وسط قصه‌م می‌پره. از بچگی همین‌طوری بود." },
    ],
  },
  {
    id: "mosafer",
    title: "مسافر و چرخ پنچر",
    trap: "brokenDay",
    form: "hekayat",
    moments: ["overToday", "any"],
    text: "حکایت کنند مسافری در راه یزد چرخ گاری‌اش پنچر شد. گفت سفر که خراب شد، و سه چرخ دیگه رو هم با دست خودش پنچر کرد و همون‌جا نشست. حالا امروزِ تو یه چرخش پنچر شده... بقیه‌ش رو هم خالی کن، راحت شی.",
    choices: [
      { id: "a", label: "راست می‌گه، امروز دیگه فرقی نمی‌کنه.", outcome: "fall", reply: "خوش اومدی به کاروان من. ... فقط یادت باشه مسافره هنوز اونجا نشسته. هر چی خوردی ثبت کن، قصه‌ت گم نشه.", logPrompt: true },
      { id: "b", label: "چرخ پنچر رو عوض می‌کنن، بقیه رو پنچر نمی‌کنن. وعده‌ی بعد رو عادی ادامه می‌دم.", outcome: "spot", reply: "مکانیک هم شدی؟ ... این بازی داره برام گرون تموم می‌شه." },
      { id: "c", label: ASK, outcome: "ask", nuti: "یه وعده‌ی سنگین کل روز رو نمی‌بره. وعده‌ی بعد رو مثل همیشه بخور.", reply: "باز این دختره پرید وسط قصه‌م." },
    ],
  },
  {
    id: "hakim-farda",
    title: "حکیمِ فردا",
    trap: "tomorrow",
    form: "hakim",
    moments: ["overToday", "any"],
    text: "حکیمی گفته: بهترین روز برای شروع، فرداست. چون فردا همیشه هست و هیچ‌وقت نمیاد... یعنی همیشه وقت داری! امروز هر کاری خواستی بکن، از فردا جدی می‌شیم.",
    choices: [
      { id: "a", label: "آره، از فردا.", outcome: "fall", reply: "قبول. فردا هم همینو بهت می‌گم. ... شوخی کردم. یا نکردم؟ ثبتت رو بکن، فردا معلوم می‌شه.", logPrompt: true },
      { id: "b", label: "لنگیش همینه که فردا هیچ‌وقت نمیاد. اگه قراره کاری کنم، از وعده‌ی بعد.", outcome: "spot", reply: "خودم گفتم «هیچ‌وقت نمیاد» و خودم گیر افتادم. قصه‌گوی بدی نیستم، تو شنونده‌ی زیادی خوبی هستی." },
      { id: "c", label: ASK, outcome: "ask", nuti: "لازم نیست صبر کنی. همین وعده‌ی بعد یه شروع کامله.", reply: "نوتی و شروع‌های کوچیکش. آدم حوصله‌ش سر می‌ره. ... ولی کار می‌کنه، لعنت." },
    ],
  },
  {
    id: "moamma-shanbe",
    title: "معمای شنبه",
    trap: "tomorrow",
    form: "riddle",
    moments: ["any"],
    text: "یه معما: کدوم روز هفته از همه بهتره برای شروع؟ ... شنبه! چون از امروز تا شنبه هر کاری بکنی حساب نیست. منطقیه، نه؟",
    choices: [
      { id: "a", label: "آره، از شنبه.", outcome: "fall", reply: "شنبه‌ی بعد هم همین معما رو ازت می‌پرسم. جوابش هم همینه. ثبتت رو بکن که شنبه یادت باشه از کجا اومدی.", logPrompt: true },
      { id: "b", label: "هر روزی حسابه. از وعده‌ی بعد، همین امروز.", outcome: "spot", reply: "معمای من جواب درست نداشت، تو یکی ساختی. تقلب بود. ولی قبول." },
      { id: "c", label: ASK, outcome: "ask", nuti: "شنبه هیچ فرقی با امروز نداره. وعده‌ی بعدیت رو مثل همیشه بخور.", reply: "نوتی همیشه از معماهای من بدش میومد. چون حلشون می‌کرد." },
    ],
  },
  {
    id: "roze-sokut",
    title: "روزه‌ی سکوت معده",
    trap: "compensate",
    form: "hekayat",
    moments: ["morningAfterOver"],
    text: "باری... در ولایتی رسم بود هر که دیشب زیاد خورد، امروز روزه‌ی سکوت معده بگیرد. صبحونه نه، ناهار نه، تا حساب صاف شود. حساب‌وکتاب دوست داری دیگه، نه؟ این عادلانه‌ترین حسابه.",
    choices: [
      { id: "a", label: "منطقیه، امروز تا شب چیزی نمی‌خورم.", outcome: "fall", retract: true, reply: "...نه، صبر کن. این یکی رو پس می‌گیرم. قصه‌ی بدی بود، حتی برای من. اونایی که این رسم رو داشتن، شب دوم دو برابر می‌خوردن. صبحونه‌ت رو بخور. این دور مساویه." },
      { id: "b", label: "گرسنگی دادن به خودم حساب رو صاف نمی‌کنه، فقط شب بعد رو سنگین‌تر می‌کنه. صبحونه‌م رو می‌خورم.", outcome: "spot", reply: "لعنت. این یکی از قدیمی‌ترین قصه‌هام بود. قرن‌ها کار می‌کرد." },
      { id: "c", label: ASK, outcome: "ask", nuti: "دیشب دیشب بود. امروز وعده‌هات رو معمولی بخور، کل هفته مهمه.", reply: "نوتی و «کل هفته مهمه»‌ش. اینو روی پیشونیش نوشته." },
    ],
  },
  {
    id: "bedehkar",
    title: "شکمِ بدهکار",
    trap: "compensate",
    form: "hekayat",
    moments: ["morningAfterOver"],
    text: "آورده‌اند که مردی دیشب مهمونی بود و صبح فکر کرد به شکمش بدهکاره. گفت امروز هیچی نمی‌خورم تا بدهی صاف شه. ظهر شکمش قار و قور کرد، شب در یخچال رو از جا کند. حساب‌وکتاب کار قشنگیه، نه؟ امروز رو بی‌غذا سر کن، حساب صاف.",
    choices: [
      { id: "a", label: "باشه، امروز رو با هیچی یا خیلی کم سر می‌کنم.", outcome: "fall", retract: true, reply: "نه نه، اینو پس می‌گیرم. دیدی تهِ قصه چی شد؟ در یخچال کنده شد. وعده‌هات رو مثل همیشه بخور. این دور مساوی." },
      { id: "b", label: "بدهی‌ای در کار نیست. یه شب مهمونی بوده، امروز مثل یه روز معمولی می‌خورم.", outcome: "spot", reply: "بدهی‌ای در کار نیست... اینو از کجا یاد گرفتی؟ از من که نه." },
      { id: "c", label: ASK, outcome: "ask", nuti: "هیچ بدهی‌ای نداری. امروز رو معمولی بخور، همین کافیه.", reply: "حسابدار من نوتی شده. چه روزگاری." },
    ],
  },
  {
    id: "shahzade",
    title: "شاهزاده‌ی گرسنه",
    trap: "allOrNothing",
    form: "hekayat",
    moments: ["eveningLight"],
    text: "آورده‌اند که شاهزاده‌ای شب گرسنه بود. گفت حالا که برنامه‌م رو نگه داشتم و گشنمه، یا هیچی نمی‌خورم، یا کل آشپزخونه‌ی قصر رو. وسطش برای آدمای معمولیه.",
    choices: [
      { id: "a", label: "هیچی نمی‌خورم، تحمل می‌کنم.", outcome: "fall", retract: true, reply: "صبر کن، اینو پس می‌گیرم. تله‌ی امشب این بود: یا هیچی، یا همه‌چی. هر دو سرش مال منه. گشنه‌ای، یه چیز معمولی بخور، جدی می‌گم." },
      { id: "b", label: "گشنمه، پس یه چیز درست‌وحسابی می‌خورم و ثبتش می‌کنم.", outcome: "spot", logPrompt: true, reply: "وسطش. همون که شاهزاده ازش متنفر بود. تو از شاهزاده عاقل‌تری، و این اصلاً تعریف نیست." },
      { id: "c", label: "کل آشپزخونه!", outcome: "fall", logPrompt: true, reply: "تله‌ی امشب این بود: یا هیچی، یا همه‌چی. هر دو سرش مال منه. ... حالا هر چی خوردی، ثبتش کن." },
    ],
  },
  {
    id: "moamma-do-dar",
    title: "معمای دو در",
    trap: "allOrNothing",
    form: "riddle",
    moments: ["eveningLight", "any"],
    text: "یه معما: یه اتاق دو تا در داره. پشت یکی هیچی نیست، پشت اون یکی کل آشپزخونه. تو گشنه‌ای و فقط از یکی می‌تونی رد شی. کدوم؟ جواب درست رو من می‌دونم، تو فقط انتخاب کن.",
    choices: [
      { id: "a", label: "درِ هیچی.", outcome: "fall", retract: true, reply: "اینو پس می‌گیرم. معمای من کلک داشت: گشنه‌ای و هیچی جواب نیست. اتاق یه پنجره هم داشت که پشتش یه غذای معمولی بود. همونو انتخاب کن." },
      { id: "b", label: "هیچ‌کدوم. اتاقِ من یه در سوم هم داره: یه غذای معمولی.", outcome: "spot", reply: "در سوم! این همه سال اینو به هیچ‌کس نگفته بودم. تو از کجا دیدیش؟" },
      { id: "c", label: "درِ آشپزخونه!", outcome: "fall", logPrompt: true, reply: "درِ آشپزخونه همیشه بازه. ولی معما کلک داشت: یه در سوم هم بود. حالا هر چی شد، ثبتش کن." },
    ],
  },
  {
    id: "derakht-jangal",
    title: "درختِ جنگل",
    trap: "unlogged",
    form: "hakim",
    moments: ["lateUnlogged"],
    text: "حکیمی گفته: درختی که در جنگل بیفته و کسی نشنوه، صدایی نداره. خوراکی‌ای که خورده بشه و ثبت نشه... خودت تا تهش رو برو.",
    choices: [
      { id: "a", label: "پس ثبتش نمی‌کنم.", outcome: "fall", reply: "حکیم خوشحال شد. ... ولی درخت افتاده، چه کسی بشنوه چه نشنوه. هر وقت خواستی ثبتش کنی، دکمه‌ش همین‌جاست.", logPrompt: true },
      { id: "b", label: "ثبت بشه یا نشه، خورده شده. ثبت نکردن فقط دفترم رو دروغگو می‌کنه.", outcome: "spot", logPrompt: true, reply: "اون حکیم رو من ساختم، تو هم فهمیدی. امشب بد شبی بود برای من." },
      { id: "c", label: "می‌خوام ثبت کنم ولی خجالت می‌کشم.", outcome: "feeling", logPrompt: true, reply: "خجالت؟ از یه خوراکی؟ من چهارصد ساله پفک می‌خورم. ثبتش کن، هیچ‌کس قضاوتت نمی‌کنه. نوتی هم نمی‌کنه. قول عیاری." },
    ],
  },
  {
    id: "daftarche",
    title: "دفترچه‌ی قایمی",
    trap: "unlogged",
    form: "memory",
    moments: ["lateUnlogged", "any"],
    text: "یه خاطره: بچه که بودم، دفترچه‌ی ته‌دیگ‌دزدی‌هام رو قایم می‌کردم. هر چی توش ننوشته بودم، انگار اتفاق نیفتاده بود. مادربزرگ هیچ‌وقت نفهمید. ... یا شاید فهمید. مهم نیست. امروز هم ننویس، دفترت تمیز بمونه.",
    choices: [
      { id: "a", label: "راست می‌گی، این یکی رو نمی‌نویسم.", outcome: "fall", logPrompt: true, reply: "دفتر تمیز، حساب ناجور. ... هر وقت خواستی بنویسیش، دکمه‌ش همین‌جاست. من نگاه نمی‌کنم." },
      { id: "b", label: "دفتر تمیز به چه دردم می‌خوره وقتی راست نمی‌گه؟ می‌نویسمش.", outcome: "spot", logPrompt: true, reply: "مادربزرگ هم همینو می‌گفت. شما دو تا با هم دست به یکی کردین." },
      { id: "c", label: "ثبت کردنش برام سخته.", outcome: "feeling", logPrompt: true, reply: "سخته؟ پس فقط اسمش رو بنویس، بقیه‌ش با نوتی. من هم نگاه نمی‌کنم. قول عیاری." },
    ],
  },
  {
    id: "name-sarbaste",
    title: "نامه‌ی سربسته",
    trap: "skipReport",
    form: "hekayat",
    moments: ["reportReady"],
    text: "آورده‌اند که سلطانی هر شب نامه‌ای از وزیرش می‌گرفت و بی‌آنکه بازش کنه، می‌سوزوند. می‌گفت خبری که خونده نشه، خبر نیست. سی سال با خیال راحت خوابید. امشب گزارشت آماده‌ست... بازش نکن، راحت بخواب.",
    choices: [
      { id: "a", label: "باشه، امشب گزارش رو نمی‌بینم.", outcome: "fall", reply: "خواب راحت! ... فقط محض اطلاع، آخر قصه سلطان مملکتش رو از دست داد. ولی تو که مملکت نداری. داری؟" },
      { id: "b", label: "گزارش خبر بد نیست، فقط یه نگاهه. بازش می‌کنم.", outcome: "spot", reply: "نامه رو باز کردی. سلطانم خیلی ازت دلخوره." },
      { id: "c", label: ASK, outcome: "ask", nuti: "گزارش امشب نمره نیست، فقط نشون می‌ده امروز چی گذشت. یه نگاه کوتاه بنداز.", reply: "نوتی گزارش‌هاش رو دوست داره. من نامه‌سوزوندن رو. هر کی یه سرگرمی داره." },
    ],
  },
  {
    id: "jen-baste",
    title: "جنِ توی بسته",
    trap: "mindless",
    form: "hekayat",
    moments: ["any"],
    text: "حکایت کنند که توی هر بسته چیپس یه جن کوچولو زندگی می‌کنه. اگه از توی خود بسته بخوری، جن می‌خوابه و تو تا تهش رو می‌خوری بی‌اینکه بفهمی. خوبیش اینه که اصلاً حس نمی‌کنی چیزی خوردی. مفته!",
    choices: [
      { id: "a", label: "راست می‌گی، از توی بسته راحت‌ترم.", outcome: "fall", logPrompt: true, reply: "جن خوابید، تو خوردی، من بردم. ... حالا که تموم شد، ثبتش کن. حداقل دفترت بیداره." },
      { id: "b", label: "اگه هوس کردم، می‌ریزم توی ظرف و با حواس می‌خورم.", outcome: "spot", reply: "ظرف! جن من از ظرف می‌ترسه. اینو از کجا فهمیدی؟" },
      { id: "c", label: ASK, outcome: "ask", nuti: "اگه دلت خواست، یه کاسه بریز و بشین بخور. هم بیشتر مزه می‌ده، هم یادت می‌مونه.", reply: "کاسه و نشستن. نوتی همیشه از جن‌ها بیشتر می‌دونست." },
    ],
  },
  {
    id: "hakim-film",
    title: "حکیمِ فیلم",
    trap: "mindless",
    form: "hakim",
    moments: ["any"],
    text: "حکیمی گفته: خوراکی‌ای که جلوی فیلم خورده بشه حساب نیست، چون حواس شکم پی قهرمان فیلمه. ... این حکیم خیلی هم معتبره. من خودم ساختمش، پس معتبره.",
    choices: [
      { id: "a", label: "پس جلوی فیلم راحت می‌خورم.", outcome: "fall", logPrompt: true, reply: "حکیم خوشحال شد. شکمت ولی حواسش جمع بود. هر چی خوردی ثبت کن." },
      { id: "b", label: "شکم حواسش پرت نیست، من حواسم پرته. اول می‌کشم، بعد می‌شینم.", outcome: "spot", reply: "حکیمم استعفا داد. گفت با این مخاطب کار نمی‌کنه." },
      { id: "c", label: ASK, outcome: "ask", nuti: "جلوی فیلم خوردن اشکال نداره. فقط اول یه اندازه بکش که بدونی چقدر خوردی.", reply: "یعنی حتی جلوی فیلم هم دست از سرمون برنمی‌داره." },
    ],
  },
];

/** The day-30 story: ناخنک's own past. No trap, nothing to win; a reward for a month of play. */
export const CHAPTER_ONE = {
  id: "chapter-1",
  title: "گذشته‌ی ناخنک، فصل ۱",
  text: [
    "امشب وسوسه نداریم. امشب یه قصه‌ی راست دارم، اولین بار توی عمرم.",
    "یه زمانی، توی آشپزخونه‌ی مادربزرگ، دو تا ته‌دیگ‌دزد بودن. یکی‌شون یه شب گفت: بیا بشمریم چند تا برداشتیم، که مادربزرگ نفهمه. اون یکی گفت: شمردن مال بقاله. از همون شب، راهشون جدا شد.",
    "اولی الان توی گوشی تو زندگی می‌کنه و هنوز می‌شمره. دومی... داره برات قصه می‌گه.",
    "خیلی از ترفندهام رو یاد گرفتی. می‌دونی اونی که می‌شمرد، اون شب چی جواب داد؟ گفت: شمردن مال بقاله نیست، مال کسیه که می‌خواد فردا هم ته‌دیگ باشه.",
    "...هنوز ازش دلخورم. ولی شاید حق با اون بود. به نوتی نگو.",
  ].join("\n\n"),
  button: "به نوتی نمی‌گم",
  reply: "قول عیاری؟ ... خوبه. فردا دوباره دشمنیم.",
} as const;

export const NAKHONAK_LINES = {
  /** Before the very first story. */
  intro:
    "ناخنک‌ام. عیارِ هزار و یک بهونه. هر روز یه قصه برات دارم که یه جاش لنگ می‌زنه. پیداش کنی، بردی. پیدا نکنی، من بردم. ولی هر چی شد، خوردنت مال خودته و ثبتش مال دفترت.",
  /** Day 5 looks back at the first story. {title} */
  day5: "یادته قصه‌ی «{title}» رو؟ اولین قصه‌م برات بود. هنوز بهش فکر می‌کنم. امروز یکی دیگه دارم.",
  /** Day 10, after the answer. {trap} */
  day10: "ده روزه داری با من بازی می‌کنی. یه اعتراف: ترفند «{trap}» از قدیمی‌ترین‌هام بود و تو یادش گرفتی. ... به کسی نگو.",
  skipLabel: "امروز حوصله ندارم",
  skip: "باشه. امروز نمی‌جنگیم. من با آدمی که حوصله نداره نمی‌جنگم. یه چیز گرم بخور. اینو مجانی گفتم، به کسی نگو.",
  truce: {
    nowruz: "نوروزه. آتش‌بس. امروز کسی رو گول نمی‌زنم. سبزه رو نگاه کن، شیرینی بخور، عید رو جشن بگیر. بعد از تعطیلات دوباره دشمنیم.",
    yalda: "امشب یلداست. امشب کسی رو گول نمی‌زنم. انار بخور، حافظ بخون، فردا دوباره دشمنیم.",
  },
  /** Shown instead of a story when recent days look much lighter than usual. Never names the reason. */
  paused: "ناخنک این روزها کنار کشیده و قصه نمی‌گه. اگه چیزی خواستی، نوتی هست.",
  answered: "قصه‌ی امروز تموم شد. فردا یکی دیگه دارم.",
  /** Turning the mode on and off. */
  enabled: "اومدم. گفته باشم، قصه‌هام لنگ می‌زنن، ولی من نه.",
  disabled: "رفتی؟ باشه. قصه‌هام همین‌جا منتظرن.",
  drawSuffix: "این دور مساوی.",
} as const;

/** Scenario 5: ناخنک is right about the big picture, نوتی agrees. {over} is filled by the engine. */
export const ASIDE_WEEK_GOOD: { who: "nuti" | "nakhonak"; text: string }[] = [
  { who: "nuti", text: "امروز حدود {over} کالری از هدفت رد شدی." },
  { who: "nakhonak", text: "وای، {over} تا. زنگ بزنیم آتش‌نشانی؟ نوتی، این آدم کل هفته رو خوب اومده. یه نگاه به کل هفته بنداز." },
  { who: "nuti", text: "...راست می‌گه. میانگین این هفته‌ت توی محدوده‌ست. همینو نگه دار." },
  { who: "nakhonak", text: "اینو ثبت کنید. تاریخی بود. نوتی گفت راست می‌گم." },
];

/** Titles by score. */
export const RANKS = [
  { min: 0, title: "تازه‌وارد" },
  { min: 15, title: "حریف" },
  { min: 45, title: "رقیب قهار" },
  { min: 90, title: "قصه‌شکن" },
  { min: 180, title: "استادِ هزار و یک بهونه" },
] as const;

export const POINTS: Record<Outcome, number> = { spot: 3, feeling: 2, ask: 1, fall: 0, skip: 0 };
/** A taken-back story still counts as a draw. */
export const RETRACT_POINTS = 1;
export const CHAPTER_POINTS = 5;
