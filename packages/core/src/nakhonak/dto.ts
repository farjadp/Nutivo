import type { NakhonakMood } from "./content";
import type { NakhonakProgress, NakhonakResult } from "./engine";

/** What the app and the bot receive for today. */
export interface AppNakhonakToday {
  date: string;
  kind: "truce" | "paused" | "chapter" | "story";
  mood: NakhonakMood;
  /** Milestone line above the story (first day, day 5). */
  intro: string | null;
  /** Truce or pause text. */
  text: string | null;
  story: { id: string; title: string; text: string; choices: { id: string; label: string }[]; skipLabel: string | null } | null;
  /** Filled once the user has answered today. */
  result: (NakhonakResult & { choice: string }) | null;
  /** «گاهی حق با ناخنکه»: shown after today's answer when it applies. */
  aside: { who: "nuti" | "nakhonak"; text: string }[] | null;
}

export interface AppNakhonak {
  enabled: boolean;
  today: AppNakhonakToday | null;
  progress: NakhonakProgress;
}
