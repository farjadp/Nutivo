/** Feature flags derived from environment. Safe on server and client (only public vars on client). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
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
