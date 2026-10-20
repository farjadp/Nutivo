/**
 * Nutivo logo from the brand board. Colour version on light grounds; the white version in dark mode,
 * because Imperial Purple disappears on dark backgrounds (1.2:1).
 * Assets are built by scripts/build-brand-assets.mjs from docs/brand/vector/.
 */
export function Logo({ variant = "lockup", className = "" }: { variant?: "lockup" | "icon"; className?: string }) {
  const name = variant === "lockup" ? "nutivo-lockup" : "nutivo-icon";
  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation needed */}
      <img src={`/brand/${name}.svg`} alt="Nutivo" className="h-full w-auto dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation needed */}
      <img src={`/brand/${name}-white.svg`} alt="" aria-hidden className="hidden h-full w-auto dark:block" />
    </span>
  );
}
