"use client";
import { codeTimerState, countdownFa, OTP_VALID_MINUTES } from "@nutivo/core";
import { MailWarning } from "lucide-react";
import { Nuti } from "@/features/mascot/ui/nuti";

const SIZE = 132;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const TOTAL = OTP_VALID_MINUTES * 60;

/**
 * The code's hour as a ring around نوتی that empties as time runs out. She floats while there is time,
 * looks worried near the end and falls asleep when the code expires. Amber near the end, never red.
 * Motion is CSS only and stops under prefers-reduced-motion.
 */
export function CodeTimer({ secondsLeft }: { secondsLeft: number }) {
  const s = codeTimerState(secondsLeft);
  const share = Math.max(0, Math.min(1, secondsLeft / TOTAL));
  return (
    <div role="timer" aria-label={secondsLeft > 0 ? `کد تا ${Math.ceil(secondsLeft / 60)} دقیقه دیگر معتبر است` : "کد منقضی شد"} className="grid justify-items-center gap-1">
      <div className="relative grid size-[132px] place-items-center">
        <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="var(--track)" strokeWidth={STROKE} fill="none" />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={s.urgent ? "var(--fat)" : "var(--green)"}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - share)}
            className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear"
          />
        </svg>
        <div className={secondsLeft > 0 ? "code-float" : ""}>
          <Nuti mood={s.mood} size={84} label="" />
        </div>
      </div>
      <p className={`tabular text-[28px] font-black leading-10 ${s.urgent ? "text-fat-ink" : "text-green-ink"}`}>{countdownFa(Math.max(0, secondsLeft))}</p>
      <p className="text-center text-sm text-ink-2">{s.line}</p>
    </div>
  );
}

/** Hard to miss: sign-in emails often land in Spam, Junk or Promotions. */
export function SpamHint() {
  return (
    <div role="note" className="flex gap-3 rounded-[var(--radius-card)] border border-fat/40 bg-fat/10 p-4">
      <MailWarning size={22} strokeWidth={1.75} className="shrink-0 text-fat-ink" aria-hidden />
      <div className="grid gap-1">
        <p className="text-[15px] font-semibold text-fat-ink">ایمیل نیامد؟ پوشه اسپم را چک کن</p>
        <p className="text-[13px] leading-6">گاهی ایمیل کد به Spam، Junk یا Promotions می‌رود. اگر آنجا بود، «Not spam» را بزن تا دفعه‌های بعد درست برسد.</p>
      </div>
    </div>
  );
}
