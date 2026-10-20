import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1),
  NUTIVO_EXTRACT_MODEL: z.string().default("claude-sonnet-5-5"),
  NUTIVO_REPORT_MODEL: z.string().default("claude-sonnet-5-5"),
  NUTIVO_REPORT_HOUR_LOCAL: z.coerce.number().int().min(0).max(23).default(21),
});

let cached: z.infer<typeof serverSchema> | null = null;

/** Server-only. Throws a readable error listing missing variables. */
export function env() {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid environment variables: ${missing}. Copy apps/web/.env.example to .env.local.`);
  }
  cached = parsed.data;
  return cached;
}
