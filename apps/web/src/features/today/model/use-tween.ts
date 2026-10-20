"use client";
import { useEffect, useRef, useState } from "react";

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Tweens from the previous target to the new one with an exponential ease-out.
 * Starts from `from` on first mount so the first paint fills up once.
 */
export function useTween(target: number, { duration = 900, from = 0, delay = 0 } = {}) {
  const [value, setValue] = useState(from);
  const current = useRef(from);

  useEffect(() => {
    if (prefersReducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    const start = current.current;
    let raf = 0;
    let t0 = 0;
    const timer = window.setTimeout(() => {
      const step = (now: number) => {
        if (!t0) t0 = now;
        const p = Math.min(1, (now - t0) / duration);
        const v = start + (target - start) * easeOutExpo(p);
        current.current = v;
        setValue(v);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    // Throttled or background tabs may deliver only a few frames; always land on the target.
    const settle = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      current.current = target;
      setValue(target);
    }, delay + duration + 80);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(settle);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return value;
}
