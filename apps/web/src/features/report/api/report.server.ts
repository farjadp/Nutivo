import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  allowedNumbers,
  buildDailyReport,
  groupThousands,
  guardNumbers,
  REPORT_OUTPUT_SCHEMA,
  REPORT_SYSTEM_PROMPT,
  ReportAnalysisSchema,
  reportFacts,
  reportPrompt,
  type Goals,
  type ReportAnalysis,
} from "@nutivo/core";
import type { LoggedItem } from "@/entities/day/sample";
import { anthropic, reportModel } from "@/lib/ai/client";
import { ENTRY_SELECT, entryItems, localDate, type EntryRow } from "@/features/today/api/load-day.server";
import { addDays } from "@/shared/lib/format";
import { itemsHash } from "../model/hash";

export class ReportError extends Error {
  constructor(readonly userMessage: string, cause?: unknown) {
    super(userMessage, { cause });
    this.name = "ReportError";
  }
}

export interface AnalysisResult {
  analysis: ReportAnalysis;
  model: string;
  ms: number;
  usage: { input_tokens: number; output_tokens: number };
  dropped: string[];
}

/** Claude writes the prose from engine facts; any sentence citing a number the engine did not produce is removed. */
export async function writeAnalysis(items: LoggedItem[], goals: Goals, date: string, dayLabel: string): Promise<AnalysisResult> {
  const facts = reportFacts(buildDailyReport({ date, items, goals }), goals);
  const model = await reportModel();
  const t0 = Date.now();
  let res: Anthropic.Message;
  try {
    const client = await anthropic();
    res = await client.messages.create({
      model,
      max_tokens: 2048,
      system: REPORT_SYSTEM_PROMPT,
      output_config: { effort: "low", format: { type: "json_schema", schema: REPORT_OUTPUT_SCHEMA } },
      messages: [{ role: "user", content: reportPrompt(facts, dayLabel) }],
    });
  } catch (err) {
    throw new ReportError("ارتباط با سرویس هوش مصنوعی برقرار نشد. چند لحظه بعد دوباره امتحان کن.", err);
  }
  if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") throw new ReportError("تحلیل کامل نشد. دوباره امتحان کن.");
  const text = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
  let parsed: ReportAnalysis;
  try {
    parsed = ReportAnalysisSchema.parse(JSON.parse(text ?? ""));
  } catch (err) {
    throw new ReportError("پاسخ سرویس قابل خواندن نبود. دوباره امتحان کن.", err);
  }

  const allowed = allowedNumbers(facts);
  const a = guardNumbers(parsed.analysis, allowed);
  const t = guardNumbers(parsed.tomorrow, allowed);
  const s = guardNumbers([parsed.strength], allowed);
  const p = guardNumbers([parsed.priority], allowed);
  const analysis: ReportAnalysis = {
    analysis: a.kept.map(groupThousands),
    tomorrow: t.kept.map(groupThousands),
    strength: groupThousands(s.kept[0] ?? ""),
    priority: groupThousands(p.kept[0] ?? ""),
  };
  return {
    analysis,
    model,
    ms: Date.now() - t0,
    usage: { input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens },
    dropped: [...a.dropped, ...t.dropped, ...s.dropped, ...p.dropped],
  };
}

/** One user's confirmed items for a local date. Works with the user's client (RLS) or the service role (cron). */
export async function itemsForDate(client: SupabaseClient, userId: string, tz: string, date: string): Promise<LoggedItem[]> {
  const from = new Date(`${addDays(date, -1)}T00:00:00Z`).toISOString();
  const to = new Date(`${addDays(date, 2)}T00:00:00Z`).toISOString();
  const { data, error } = await client
    .from("meal_entries")
    .select(ENTRY_SELECT)
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .gte("eaten_at", from)
    .lt("eaten_at", to)
    .order("eaten_at", { ascending: true });
  if (error) throw new Error(`entries query failed: ${error.message}`);
  return ((data ?? []) as unknown as EntryRow[]).filter((e) => localDate(e.eaten_at, tz) === date).flatMap(entryItems);
}

export interface StoredReport {
  analysis: ReportAnalysis | null;
  source_hash: string | null;
  generated_at: string | null;
}

export async function readReport(client: SupabaseClient, userId: string, date: string): Promise<StoredReport> {
  const { data } = await client.from("daily_reports").select("analysis, source_hash, generated_at").eq("user_id", userId).eq("date", date).maybeSingle();
  const parsed = ReportAnalysisSchema.safeParse(data?.analysis);
  return { analysis: parsed.success ? parsed.data : null, source_hash: data?.source_hash ?? null, generated_at: data?.generated_at ?? null };
}

export async function storeReport(client: SupabaseClient, userId: string, date: string, items: LoggedItem[], goals: Goals, r: AnalysisResult) {
  const report = buildDailyReport({ date, items, goals });
  const { error } = await client.from("daily_reports").upsert(
    {
      user_id: userId,
      date,
      totals: reportFacts(report, goals),
      analysis: r.analysis,
      is_partial: report.is_partial,
      source_hash: itemsHash(items),
      model: r.model,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );
  if (error) throw new Error(`report upsert failed: ${error.message}`);
}
