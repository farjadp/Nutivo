import "server-only";
import { adminClient, isAdminConfigured } from "@/lib/supabase/admin";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogInput {
  kind: "activity" | "system";
  event: string;
  level?: LogLevel;
  actor_id?: string | null;
  actor_email?: string | null;
  entity?: string;
  entity_id?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

/**
 * Writes to public.activity_log through the service role. Never throws:
 * logging must not break the user's action. Always mirrors to the server console.
 */
export async function logEvent(e: LogInput): Promise<void> {
  const row = { level: "info" as LogLevel, ...e, meta: e.meta ?? {} };
  const line = `[${row.kind}:${row.level}] ${row.event}${row.message ? ` — ${row.message}` : ""}`;
  if (row.level === "error") console.error(line, row.meta);
  else if (process.env.NODE_ENV !== "production") console.info(line);
  if (!isAdminConfigured()) return;
  try {
    const { error } = await adminClient().from("activity_log").insert(row);
    if (error) console.error("logEvent insert failed", error.message);
  } catch (err) {
    console.error("logEvent failed", err);
  }
}
