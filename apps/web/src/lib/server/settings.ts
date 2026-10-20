import "server-only";
import { adminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { canEncrypt, decryptSecret } from "./secrets";

/** Keys the admin panel manages. Secrets are encrypted; the rest are plain JSON values. */
export const SETTING_KEYS = {
  anthropicKey: "ai.anthropic.api_key",
  anthropicExtractModel: "ai.anthropic.extract_model",
  anthropicReportModel: "ai.anthropic.report_model",
  openaiKey: "ai.openai.api_key",
  openaiTranscribeModel: "ai.openai.transcribe_model",
  googleKey: "ai.google.api_key",
  reportHour: "app.report_hour_local",
} as const;

interface Row {
  key: string;
  value: unknown;
  secret_ciphertext: string | null;
  secret_last4: string | null;
  updated_at: string;
}

let cache: { at: number; rows: Map<string, Row> } | null = null;
const TTL_MS = 30_000;

export function invalidateSettings() {
  cache = null;
}

async function rows(): Promise<Map<string, Row>> {
  if (!isAdminConfigured()) return new Map();
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  const { data, error } = await adminClient().from("app_settings").select("key, value, secret_ciphertext, secret_last4, updated_at");
  if (error) {
    console.error("settings read failed", error.message);
    return cache?.rows ?? new Map();
  }
  const map = new Map((data as Row[]).map((r) => [r.key, r]));
  cache = { at: Date.now(), rows: map };
  return map;
}

/** Secret from the admin panel, else the env var fallback. */
export async function getSecret(key: string, envFallback?: string): Promise<string | undefined> {
  const r = (await rows()).get(key);
  if (r?.secret_ciphertext && canEncrypt()) {
    try {
      return decryptSecret(r.secret_ciphertext);
    } catch (err) {
      console.error(`cannot decrypt ${key}; was NUTIVO_SECRETS_KEY changed?`, err);
    }
  }
  return envFallback ? process.env[envFallback] || undefined : undefined;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const r = (await rows()).get(key);
  return (r?.value as T) ?? fallback;
}

/** Masked view for the admin UI: never returns secret values. */
export async function listSettingsMasked() {
  const map = await rows();
  return [...map.values()].map((r) => ({
    key: r.key,
    value: r.secret_ciphertext ? null : r.value,
    hasSecret: Boolean(r.secret_ciphertext),
    last4: r.secret_last4,
    updated_at: r.updated_at,
  }));
}
