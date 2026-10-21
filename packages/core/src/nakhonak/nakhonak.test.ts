import { describe, expect, it } from "vitest";
import {
  ASIDE_WEEK_GOOD,
  CHAPTER_DAY,
  CHAPTER_ONE,
  NAKHONAK_LINES,
  STORIES,
  TRAPS,
  answer,
  holidayOn,
  introFor,
  momentsNow,
  planToday,
  progressOf,
  shouldPause,
  toJalali,
  weekGoodAside,
  type NakhonakContext,
  type NakhonakPlay,
} from "./index";

const EMOJI = /\p{Extended_Pictographic}/u;
const LATIN_DIGIT = /[0-9]/;
const BODY = /(وزن|چاق|لاغر|هیکل|ترازو|کیلو|شکم‌گنده|اندام|سایز)/;

function allCopy(): string[] {
  const out: string[] = [];
  for (const s of STORIES) {
    out.push(s.title, s.text);
    for (const c of s.choices) out.push(c.label, c.reply, ...(c.nuti ? [c.nuti] : []));
  }
  for (const t of Object.values(TRAPS)) out.push(t.name, t.explain);
  out.push(CHAPTER_ONE.title, CHAPTER_ONE.text, CHAPTER_ONE.button, CHAPTER_ONE.reply);
  for (const v of Object.values(NAKHONAK_LINES)) out.push(...(typeof v === "string" ? [v] : Object.values(v)));
  out.push(...ASIDE_WEEK_GOOD.map((l) => l.text));
  return out;
}

function ctx(over: Partial<NakhonakContext> = {}): NakhonakContext {
  return {
    date: "2026-10-21",
    hour: 15,
    goalKcal: 2000,
    today: { kcal: 1200, meals: 2, dinnerLogged: false },
    recent: [],
    plays: [],
    ...over,
  };
}

function days(n: number, from = "2026-09-01"): NakhonakPlay[] {
  const d = new Date(`${from}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() + i);
    return { date: x.toISOString().slice(0, 10), storyId: "jen-baste", outcome: "spot" as const, points: 3 };
  });
}

describe("ناخنک copy rules", () => {
  it("has no emoji, no Latin digits and no body or weight words", () => {
    for (const line of allCopy()) {
      expect(line, line).not.toMatch(EMOJI);
      expect(line, line).not.toMatch(LATIN_DIGIT);
      expect(line, line).not.toMatch(BODY);
    }
  });

  it("gives every story exactly one right answer and three choices a, b, c", () => {
    for (const s of STORIES) {
      expect(s.choices.map((c) => c.id)).toEqual(["a", "b", "c"]);
      expect(s.choices.filter((c) => c.outcome === "spot")).toHaveLength(1);
    }
  });

  it("takes back every fall that leads towards going hungry", () => {
    for (const s of STORIES) {
      for (const c of s.choices.filter((c) => c.retract)) {
        expect(c.outcome).toBe("fall");
        expect(c.reply).toContain("پس می‌گیرم");
      }
    }
    // The compensate and all-or-nothing traps are the ones that can push towards skipping food.
    const risky = STORIES.filter((s) => s.trap === "compensate" || s.trap === "allOrNothing");
    for (const s of risky) {
      const toward = s.choices.find((c) => c.outcome === "fall" && /(نمی‌خورم|هیچی|کم سر)/.test(c.label));
      expect(toward?.retract, s.id).toBe(true);
    }
  });

  it("asks for honest logging when ناخنک wins on a food story", () => {
    const foodTraps = new Set(["brokenDay", "tomorrow", "unlogged", "mindless"]);
    for (const s of STORIES.filter((s) => foodTraps.has(s.trap))) {
      const fall = s.choices.find((c) => c.outcome === "fall")!;
      expect(fall.logPrompt, s.id).toBe(true);
    }
  });

  it("gives every ask choice a نوتی line, and every trap at least one story", () => {
    for (const s of STORIES) for (const c of s.choices.filter((c) => c.outcome === "ask")) expect(c.nuti, s.id).toBeTruthy();
    for (const id of Object.keys(TRAPS)) expect(STORIES.some((s) => s.trap === id), id).toBe(true);
  });

  it("uses unique story ids", () => {
    expect(new Set(STORIES.map((s) => s.id)).size).toBe(STORIES.length);
  });
});

describe("calendar", () => {
  it("converts known dates", () => {
    expect(toJalali(2026, 3, 21)).toEqual([1405, 1, 1]);
    expect(toJalali(2025, 3, 21)).toEqual([1404, 1, 1]);
    expect(toJalali(2026, 12, 21)).toEqual([1405, 9, 30]);
    expect(toJalali(2026, 10, 21)).toEqual([1405, 7, 29]);
  });

  it("finds the truces", () => {
    expect(holidayOn("2026-03-21")).toBe("nowruz");
    expect(holidayOn("2026-03-24")).toBe("nowruz");
    expect(holidayOn("2026-03-25")).toBeNull();
    expect(holidayOn("2026-12-21")).toBe("yalda");
    expect(holidayOn("2026-10-21")).toBeNull();
  });
});

describe("planToday", () => {
  it("calls a truce on Nowruz and Yalda", () => {
    expect(planToday(ctx({ date: "2026-03-22" }))).toEqual({ kind: "truce", holiday: "nowruz" });
    expect(planToday(ctx({ date: "2026-12-21" }))).toEqual({ kind: "truce", holiday: "yalda" });
  });

  it("steps back when the last week is far below the goal", () => {
    const recent = ["2026-10-20", "2026-10-19", "2026-10-18"].map((date) => ({ date, kcal: 700, meals: 2 }));
    expect(shouldPause(ctx({ recent }))).toBe(true);
    expect(planToday(ctx({ recent }))).toEqual({ kind: "paused" });
    const normal = recent.map((r) => ({ ...r, kcal: 1900 }));
    expect(shouldPause(ctx({ recent: normal }))).toBe(false);
  });

  it("picks a compensate story the morning after a big day", () => {
    const c = ctx({ hour: 9, today: { kcal: 0, meals: 0, dinnerLogged: false }, recent: [{ date: "2026-10-20", kcal: 3200, meals: 4 }] });
    expect(momentsNow(c)[0]).toBe("morningAfterOver");
    const plan = planToday(c);
    expect(plan.kind).toBe("story");
    if (plan.kind === "story") expect(STORIES.find((s) => s.id === plan.storyId)?.trap).toBe("compensate");
  });

  it("picks an unlogged-dinner story late at night", () => {
    const plan = planToday(ctx({ hour: 22, today: { kcal: 1500, meals: 2, dinnerLogged: false } }));
    if (plan.kind !== "story") throw new Error("expected a story");
    expect(STORIES.find((s) => s.id === plan.storyId)?.trap).toBe("unlogged");
  });

  it("does not suggest a hidden meal on an empty day", () => {
    expect(momentsNow(ctx({ hour: 22, today: { kcal: 0, meals: 0, dinnerLogged: false } }))).toEqual(["any"]);
  });

  it("keeps an answered story, and avoids repeating recent ones", () => {
    const existing: NakhonakPlay = { date: "2026-10-21", storyId: "kuzegar", outcome: "spot", points: 3 };
    expect(planToday(ctx({ plays: [existing] }), existing)).toEqual({ kind: "story", storyId: "kuzegar" });
    const plays: NakhonakPlay[] = [{ date: "2026-10-20", storyId: "jen-baste", outcome: "fall", points: 0 }];
    for (let h = 0; h < 5; h++) {
      const plan = planToday(ctx({ plays, date: `2026-11-0${h + 1}` }));
      if (plan.kind === "story") expect(plan.storyId).not.toBe("jen-baste");
    }
  });

  it("tells the chapter on the thirtieth played day, once", () => {
    const plays = days(CHAPTER_DAY - 1);
    expect(planToday(ctx({ plays }))).toEqual({ kind: "chapter", storyId: CHAPTER_ONE.id });
    const after = [...plays, { date: "2026-10-20", storyId: CHAPTER_ONE.id, outcome: "feeling" as const, points: 5 }];
    expect(planToday(ctx({ plays: after })).kind).toBe("story");
  });
});

describe("answer", () => {
  it("scores a spot, a fall, a feeling, an ask and a skip", () => {
    expect(answer("kuzegar", "b", ctx())).toMatchObject({ outcome: "spot", points: 3, mood: "beaten" });
    expect(answer("kuzegar", "a", ctx())).toMatchObject({ outcome: "fall", points: 0, mood: "smug", logPrompt: true });
    expect(answer("derakht-jangal", "c", ctx())).toMatchObject({ outcome: "feeling", points: 2, mood: "gentle" });
    expect(answer("kuzegar", "c", ctx())?.nuti).toBeTruthy();
    expect(answer("kuzegar", "x", ctx())).toMatchObject({ outcome: "skip", points: 0 });
  });

  it("makes a taken-back story a draw", () => {
    expect(answer("roze-sokut", "a", ctx())).toMatchObject({ outcome: "fall", retract: true, points: 1, mood: "gentle" });
  });

  it("rejects unknown choices", () => {
    expect(answer("kuzegar", "z", ctx())).toBeNull();
    expect(answer("nope", "a", ctx())).toBeNull();
    expect(answer(CHAPTER_ONE.id, "a", ctx())).toBeNull();
  });

  it("confesses on the tenth day", () => {
    const r = answer("kuzegar", "b", ctx({ plays: days(9) }));
    expect(r?.extra).toContain(TRAPS.mindless.name);
  });
});

describe("intro and progress", () => {
  it("introduces itself on the first day and looks back on the fifth", () => {
    expect(introFor(ctx())).toBe(NAKHONAK_LINES.intro);
    expect(introFor(ctx({ plays: days(4) }))).toContain("جنِ توی بسته");
    expect(introFor(ctx({ plays: days(2) }))).toBeNull();
  });

  it("counts score, played days, traps and rank", () => {
    const p = progressOf([...days(5), { date: "2026-10-01", storyId: "kuzegar", outcome: "skip", points: 0 }]);
    expect(p.score).toBe(15);
    expect(p.playedDays).toBe(5);
    expect(p.rank).toBe("حریف");
    expect(p.traps.find((t) => t.id === "mindless")).toMatchObject({ found: 5, mastered: true });
    expect(p.chapter).toMatchObject({ unlocked: false, daysLeft: 25, text: "" });
  });
});

describe("weekGoodAside", () => {
  it("lets ناخنک be right when the week is in range", () => {
    const recent = ["2026-10-20", "2026-10-19", "2026-10-18", "2026-10-17"].map((date) => ({ date, kcal: 1950, meals: 3 }));
    const aside = weekGoodAside(ctx({ today: { kcal: 2150, meals: 3, dinnerLogged: true }, recent }));
    expect(aside?.[0]?.text).toContain("۱۵۰");
    expect(weekGoodAside(ctx({ today: { kcal: 1800, meals: 3, dinnerLogged: true }, recent }))).toBeNull();
  });
});
