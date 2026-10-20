"use client";
import { useNutiEnabled } from "../model/enabled";
import { Nuti } from "./nuti";

export function NutiToggle() {
  const [on, setOn] = useNutiEnabled();
  return (
    <label htmlFor="nuti-on" className="flex cursor-pointer items-center gap-3 px-4 py-3">
      <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-purple-tint">
        <Nuti size={36} label="" mood={on ? "happy" : "sleepy"} />
      </span>
      <span className="flex-1">
        <span className="block text-[15px] font-semibold">نوتی</span>
        <span className="block text-xs text-ink-2">{on ? "دستیار بامزه روشن است" : "حالت ساده: فقط اعداد و پیشنهاد"}</span>
      </span>
      <input id="nuti-on" type="checkbox" role="switch" checked={on} onChange={(e) => setOn(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="relative h-6 w-11 rounded-full bg-track transition-colors duration-200 peer-checked:bg-green-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-green-ink after:absolute after:top-0.5 after:start-0.5 after:size-5 after:rounded-full after:bg-surface after:shadow after:transition-transform after:duration-200 peer-checked:after:-translate-x-5" />
    </label>
  );
}
