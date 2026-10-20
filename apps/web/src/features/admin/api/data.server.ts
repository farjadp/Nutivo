import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { SAMPLE_LOGS, SAMPLE_STATS, SAMPLE_USERS } from "../model/sample";
import { PAGE_SIZE, type AdminMetrics, type AdminStats, type AdminUserRow, type LogFilters, type LogRow, type Page } from "../model/types";
import type { AdminContext } from "./guard.server";

export function pageParam(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export async function getStats(ctx: AdminContext): Promise<{ stats: AdminStats; source: "live" | "sample" }> {
  if (!ctx.live) return { stats: SAMPLE_STATS, source: "sample" };
  const { data, error } = await adminClient().rpc("admin_stats");
  if (error) throw new Error(`admin_stats: ${error.message}`);
  return { stats: data as AdminStats, source: "live" };
}

export async function listUsers(ctx: AdminContext, opts: { q?: string; status?: string; page: number }): Promise<Page<AdminUserRow>> {
  const pageSize = PAGE_SIZE;
  if (!ctx.live) {
    const q = opts.q?.toLowerCase() ?? "";
    const filtered = SAMPLE_USERS.filter((u) => (!q || u.email.includes(q)) && (!opts.status || u.status === opts.status));
    return { rows: filtered.slice((opts.page - 1) * pageSize, opts.page * pageSize), total: filtered.length, page: opts.page, pageSize, source: "sample" };
  }
  const { data, error } = await adminClient().rpc("admin_list_users", {
    q: opts.q || null,
    lim: pageSize,
    off: (opts.page - 1) * pageSize,
    only_status: opts.status || null,
  });
  if (error) throw new Error(`admin_list_users: ${error.message}`);
  const rows = (data ?? []) as (AdminUserRow & { total_count: number })[];
  return { rows, total: Number(rows[0]?.total_count ?? 0), page: opts.page, pageSize, source: "live" };
}

export async function getUser(ctx: AdminContext, id: string) {
  if (!ctx.live) {
    const u = SAMPLE_USERS.find((x) => x.id === id);
    return u ? { user: u, profile: u.goal_kcal ? { goal: "lose", goal_kcal: u.goal_kcal, goal_protein_g: 130, goal_carbs_g: 190, goal_fat_g: 60, weight_kg: 82, height_cm: 176, age: 34, sex: "male", activity: "light", timezone: "America/Toronto" } : null, source: "sample" as const } : null;
  }
  const db = adminClient();
  const [{ data: rows, error }, { data: profile }] = await Promise.all([
    db.rpc("admin_get_user", { uid: id }),
    db.from("profiles").select("*").eq("id", id).maybeSingle(),
  ]);
  if (error) throw new Error(`admin_get_user: ${error.message}`);
  const user = ((rows ?? []) as AdminUserRow[])[0];
  if (!user) return null;
  return { user, profile, source: "live" as const };
}

export async function listUserMeals(ctx: AdminContext, userId: string, page: number) {
  const pageSize = 10;
  if (!ctx.live) {
    const rows = Array.from({ length: 23 }, (_, i) => ({
      id: `s-${i}`,
      eaten_at: new Date(Date.UTC(2026, 9, 20, 13) - i * 7 * 3600_000).toISOString(),
      meal_type: (["breakfast", "lunch", "snack", "dinner"] as const)[i % 4],
      input_channel: i % 3 === 0 ? "web_photo" : "web_text",
      raw_input: ["دو کفگیر برنج و جوجه", "نان و پنیر و گردو", "ماست و خیار", "قورمه‌سبزی با چلو"][i % 4],
      kcal: 380 + ((i * 97) % 420),
      items: 2 + (i % 3),
    }));
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize, source: "sample" as const };
  }
  const { data, error, count } = await adminClient()
    .from("meal_entries")
    .select("id, eaten_at, meal_type, input_channel, raw_input, entry_items(kcal)", { count: "exact" })
    .eq("user_id", userId)
    .order("eaten_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(`user meals: ${error.message}`);
  const rows = (data ?? []).map((m) => ({
    id: m.id as string,
    eaten_at: m.eaten_at as string,
    meal_type: m.meal_type as string,
    input_channel: m.input_channel as string,
    raw_input: m.raw_input as string | null,
    kcal: Math.round(((m.entry_items as { kcal: number }[]) ?? []).reduce((a, i) => a + Number(i.kcal), 0)),
    items: ((m.entry_items as unknown[]) ?? []).length,
  }));
  return { rows, total: count ?? 0, page, pageSize, source: "live" as const };
}

export async function listLogs(ctx: AdminContext, f: LogFilters, page: number, pageSize = PAGE_SIZE): Promise<Page<LogRow>> {
  if (!ctx.live) {
    const q = f.q?.toLowerCase();
    const rows = SAMPLE_LOGS.filter(
      (r) =>
        (!f.kind || r.kind === f.kind) &&
        (!f.level || r.level === f.level) &&
        (!f.event || r.event.startsWith(f.event)) &&
        (!f.actor || r.actor_id === f.actor || r.actor_email === f.actor) &&
        (!q || [r.event, r.message, r.actor_email].some((v) => v?.toLowerCase().includes(q))),
    );
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize, source: "sample" };
  }
  let query = adminClient().from("activity_log").select("*", { count: "exact" });
  if (f.kind) query = query.eq("kind", f.kind);
  if (f.level) query = query.eq("level", f.level);
  if (f.event) query = query.like("event", `${f.event.replace(/[%_]/g, "")}%`);
  if (f.actor) query = query.eq("actor_id", f.actor);
  if (f.q) {
    const q = f.q.replace(/[%_,()]/g, " ").trim();
    if (q) query = query.or(`event.ilike.%${q}%,message.ilike.%${q}%,actor_email.ilike.%${q}%`);
  }
  const { data, error, count } = await query.order("at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(`activity_log: ${error.message}`);
  return { rows: (data ?? []) as LogRow[], total: count ?? 0, page, pageSize, source: "live" };
}

export async function getMetrics(ctx: AdminContext): Promise<{ metrics: AdminMetrics | null; source: "live" | "sample" }> {
  if (!ctx.live) return { metrics: null, source: "sample" };
  const { data, error } = await adminClient().rpc("admin_metrics", { weeks: 8, ai_days: 14 });
  if (error) throw new Error(`admin_metrics: ${error.message}`);
  return { metrics: data as AdminMetrics, source: "live" };
}
