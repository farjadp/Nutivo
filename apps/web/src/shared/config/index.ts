/** Feature flags derived from environment. Safe on server and client (only public vars on client). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}


export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Review mode without login (development only). Meals and goals live in the browser;
 * Claude extraction and the food database stay real. Never active in production builds.
 */
export function isAuthDisabled(): boolean {
  return process.env.NUTIVO_AUTH_DISABLED === "true" && process.env.NODE_ENV !== "production";
}

/**
 * FigFit food database (CC BY-NC-SA 4.0): non-commercial use only, so it is searchable
 * only when NUTIVO_FIGFIT=on and never in production builds.
 */
export function isFigfitEnabled(): boolean {
  return process.env.NUTIVO_FIGFIT === "on" && process.env.NODE_ENV !== "production";
}

/** Food sources excluded from search for this deployment. */
export function excludedFoodSources(): string[] {
  return isFigfitEnabled() ? [] : ["figfit"];
}

/**
 * USD per million tokens for the admin cost chart. Defaults are an assumption until set:
 * NUTIVO_AI_PRICE_IN / NUTIVO_AI_PRICE_OUT (check the provider's current price list).
 */
export function aiPrices(): { input: number; output: number; assumed: boolean } {
  const i = Number(process.env.NUTIVO_AI_PRICE_IN);
  const o = Number(process.env.NUTIVO_AI_PRICE_OUT);
  const set = Number.isFinite(i) && i > 0 && Number.isFinite(o) && o > 0;
  return set ? { input: i, output: o, assumed: false } : { input: 3, output: 15, assumed: true };
}

/** Shared secret between the web app and the Telegram bot process (≥ 32 chars). Unset = bot API off. */
export function botSecret(): string | null {
  const s = process.env.NUTIVO_BOT_SECRET ?? "";
  return s.length >= 32 ? s : null;
}
