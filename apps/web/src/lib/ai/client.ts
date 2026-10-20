import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getSecret, getSetting, SETTING_KEYS } from "@/lib/server/settings";

let cached: { key: string; client: Anthropic } | null = null;

/** Anthropic key: admin panel setting first, then ANTHROPIC_API_KEY. */
export async function anthropicKey(): Promise<string | undefined> {
  return getSecret(SETTING_KEYS.anthropicKey, "ANTHROPIC_API_KEY");
}

export async function anthropic(): Promise<Anthropic> {
  const key = await anthropicKey();
  if (!key) throw new Error("Anthropic API key is not configured");
  if (cached?.key !== key) cached = { key, client: new Anthropic({ apiKey: key }) };
  return cached.client;
}

export async function extractModel(): Promise<string> {
  return getSetting(SETTING_KEYS.anthropicExtractModel, process.env.NUTIVO_EXTRACT_MODEL || "claude-sonnet-5-5");
}

export async function reportModel(): Promise<string> {
  return getSetting(SETTING_KEYS.anthropicReportModel, process.env.NUTIVO_REPORT_MODEL || "claude-sonnet-5-5");
}
