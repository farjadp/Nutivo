"use client";
import { useState } from "react";
import { Confetti, Nuti, type NutiMood } from "@/features/mascot/ui/nuti";

const MOODS: { m: NutiMood; l: string }[] = [
  { m: "happy", l: "همیشگی" },
  { m: "wink", l: "بعد از ثبت" },
  { m: "chew", l: "در حال خواندن" },
  { m: "think", l: "سؤال / پروتئین کم" },
  { m: "wow", l: "زنجیره، عکس" },
  { m: "cheer", l: "روز کامل" },
  { m: "sleepy", l: "دیروقت" },
];

export function NutiSheet() {
  const [hop, setHop] = useState(0);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">نوتی</h1>
      <button type="button" onClick={() => setHop((h) => h + 1)} className="mt-3 h-9 rounded-[var(--radius-btn)] bg-green-ink px-4 text-sm font-semibold text-surface">
        پخش دوباره حرکت‌ها
      </button>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {MOODS.map(({ m, l }) => (
          <li key={m} className="relative grid justify-items-center gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-4">
            {m === "cheer" && <Confetti key={hop} />}
            <Nuti mood={m} size={120} hopKey={hop} />
            <span className="text-sm font-semibold">{l}</span>
            <code dir="ltr" className="font-mono text-[11px] text-ink-2">{m}</code>
          </li>
        ))}
        <li className="grid justify-items-center gap-2 rounded-[var(--radius-card)] bg-purple-tint p-4">
          <div className="flex items-end gap-2">
            <Nuti size={56} />
            <Nuti size={40} />
            <Nuti size={28} />
          </div>
          <span className="text-sm font-semibold">اندازه‌های کوچک</span>
        </li>
      </ul>
    </main>
  );
}
