"use client";
/**
 * نوتی — Nutivo's mascot. Hand-drawn SVG on a 120 grid so every mood shares one face.
 * Motion lives in globals.css (nuti-*): ease-in-out / ease-out only, no overshoot (no bounce).
 */
import type { NutiMood } from "@nutivo/core";
export type { NutiMood };

const INK = "#20252B";
const SKIN = "#F6D3B8";
const HAIR = "#2B2320";
const MOUTH = "#8E2A3F";
const BLUSH = "#F2949A";
const GREEN = "#00A693";
const PURPLE = "#66023C";

function Eyes({ mood }: { mood: NutiMood }) {
  const open = (cx: number, cy = 64, rx = 4, ry = 5) => (
    <g className="nuti-eye">
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={INK} />
      <circle cx={cx + 1.4} cy={cy - 2} r={rx * 0.36} fill="#fff" />
    </g>
  );
  const arc = (x: number) => <path d={`M${x} 66q5-6 10 0`} stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />;
  switch (mood) {
    case "cheer":
      return <>{arc(42)}{arc(68)}</>;
    case "wink":
      return <>{open(47)}{arc(68)}</>;
    case "wow":
      return <>{open(47, 64, 5, 6)}{open(73, 64, 5, 6)}</>;
    case "sleepy":
      return (
        <>
          <path d="M42 65q5 3 10 0" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
          <path d="M68 65q5 3 10 0" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
        </>
      );
    case "think":
      return (
        <>
          {open(48, 62)}
          {open(74, 62)}
          <path d="M67 54l10-3" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        </>
      );
    default:
      return <>{open(47)}{open(73)}</>;
  }
}

function Mouth({ mood }: { mood: NutiMood }) {
  switch (mood) {
    case "cheer":
    case "wink":
      return (
        <g>
          <path d="M51 77h18q-1 10-9 10t-9-10z" fill={MOUTH} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <ellipse cx={60} cy={84.2} rx={3.6} ry={2} fill={BLUSH} />
        </g>
      );
    case "chew":
      return <ellipse className="nuti-chew" cx={60} cy={80} rx={4.5} ry={3.2} fill={MOUTH} stroke={INK} strokeWidth={2} />;
    case "wow":
      return <ellipse cx={60} cy={81} rx={3.6} ry={4.6} fill={MOUTH} stroke={INK} strokeWidth={2} />;
    case "think":
      return <path d="M54 81q6 3.5 13-1.5" stroke={INK} strokeWidth={2.5} strokeLinecap="round" fill="none" />;
    case "sleepy":
      return <ellipse cx={60} cy={81} rx={2.6} ry={2.2} fill={MOUTH} stroke={INK} strokeWidth={1.8} />;
    default:
      return <path d="M52 78q8 7.5 16 0" stroke={INK} strokeWidth={2.5} strokeLinecap="round" fill="none" />;
  }
}

interface Props {
  mood?: NutiMood;
  size?: number;
  /** Change to replay a hop (e.g. after a meal is logged). */
  hopKey?: number;
  className?: string;
  label?: string;
}

export function Nuti({ mood = "happy", size = 72, hopKey = 0, className = "", label = "نوتی" }: Props) {
  const hop = mood === "cheer" ? "nuti-cheer" : hopKey ? "nuti-hop" : "";
  return (
    <svg
      key={`${hopKey}-${mood}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={label}
      className={`nuti shrink-0 overflow-visible ${hop} ${mood === "think" ? "nuti-tilt" : ""} ${className}`}
    >
      <g className="nuti-body">
        {/* pigtails sit behind the head */}
        <g className="nuti-pt-l">
          <circle cx={18} cy={42} r={13} fill={HAIR} stroke={INK} strokeWidth={2.5} />
          <rect x={26} y={38} width={8} height={11} rx={3.5} fill={PURPLE} stroke={INK} strokeWidth={2} transform="rotate(-20 30 43)" />
        </g>
        <g className="nuti-pt-r">
          <circle cx={102} cy={42} r={13} fill={HAIR} stroke={INK} strokeWidth={2.5} />
          <rect x={86} y={38} width={8} height={11} rx={3.5} fill={PURPLE} stroke={INK} strokeWidth={2} transform="rotate(20 90 43)" />
        </g>

        {/* shoulders: brand green top with a purple collar */}
        <path d="M27 120c2-14 15-22 33-22s31 8 33 22z" fill={GREEN} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <path d="M49 99l11 8 11-8" stroke={PURPLE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/* head */}
        <circle cx={60} cy={61} r={34} fill={SKIN} stroke={INK} strokeWidth={2.5} />
        {/* hair cap with bangs */}
        <path
          d="M26 64C24 40 40 25 60 25s36 15 34 39C92 52 84 46 76 46c-2 4-6 6-10 6 1-3 1-6 0-8-6 6-14 8-22 7 1-3 1-6 0-8-8 4-14 11-18 21z"
          fill={HAIR}
          stroke={INK}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {/* leaf hair clip: nutrition, in brand green */}
        <path d="M77 35c2-6 8-9 15-8-1 6-8 9-15 8z" fill={GREEN} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        <path d="M77 35l9-5" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />

        <ellipse cx={40} cy={74} rx={6} ry={3.6} fill={BLUSH} opacity={0.55} />
        <ellipse cx={80} cy={74} rx={6} ry={3.6} fill={BLUSH} opacity={0.55} />
        <Eyes mood={mood} />
        <Mouth mood={mood} />

        {mood === "sleepy" && <path className="nuti-z" d="M92 18h7l-7 8h7" stroke={PURPLE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
      </g>
    </svg>
  );
}

/** One-shot confetti in brand colours. Re-mount (change key) to replay. */
export function Confetti() {
  return (
    <span aria-hidden className="nuti-confetti pointer-events-none absolute inset-0 overflow-visible">
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} className={`nuti-bit nuti-bit-${i % 7} ${i % 2 ? "nuti-bit-alt" : ""}`} />
      ))}
    </span>
  );
}
