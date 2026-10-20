/** SAMPLE admin data, shown only while SUPABASE_SERVICE_ROLE_KEY is not set. Clearly labelled in the UI. */
import type { AdminStats, AdminUserRow, LogRow } from "./types";

const names = ["sara.k", "reza.m", "nazanin", "amir.h", "leila.r", "babak", "mina.t", "kian", "parisa", "omid.s", "shirin", "arash", "elham", "pouya", "neda", "farhad", "yasmin", "hamed", "golnaz", "behrad", "tara", "navid", "roya", "sina", "maryam.a", "dariush", "azadeh", "kaveh", "nasrin", "shayan", "mahsa", "ehsan"];

const base = Date.UTC(2026, 9, 20, 18, 0, 0);
const hoursAgo = (h: number) => new Date(base - h * 3600_000).toISOString();

export const SAMPLE_USERS: AdminUserRow[] = names.map((n, i) => {
  const total = (i * 37) % 120;
  return {
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    email: `${n}@example.com`,
    created_at: hoursAgo(24 * (i * 2 + 1)),
    last_sign_in_at: i % 5 === 4 ? null : hoursAgo(i * 7 + 2),
    banned_until: i === 6 ? "2126-01-01T00:00:00Z" : null,
    status: i === 6 ? "blocked" : "active",
    is_admin: i === 0,
    goal_kcal: i % 4 === 3 ? null : 1600 + ((i * 113) % 900),
    meals_total: total,
    meals_7d: Math.min(total, (i * 5) % 22),
    last_meal_at: total ? hoursAgo(i * 9 + 1) : null,
  };
});

export const SAMPLE_STATS: AdminStats = {
  users_total: SAMPLE_USERS.length,
  users_7d: 4,
  active_today: 9,
  active_7d: 21,
  meals_today: 27,
  photo_share_7d: 0.34,
  ai_calls_24h: 41,
  errors_24h: 2,
  blocked: 1,
};

const events: Omit<LogRow, "id" | "at">[] = [
  { kind: "system", level: "info", event: "ai.extract", actor_id: null, actor_email: "sara.k@example.com", entity: null, entity_id: null, message: "text → 3 items", meta: { model: "claude-sonnet-5-5", ms: 1840, input_tokens: 1210, output_tokens: 164, items: 3 } },
  { kind: "activity", level: "info", event: "meal.confirmed", actor_id: null, actor_email: "sara.k@example.com", entity: "meal_entries", entity_id: "m-1", message: null, meta: { meal_type: "lunch", channel: "web_text" } },
  { kind: "system", level: "info", event: "ai.extract", actor_id: null, actor_email: "reza.m@example.com", entity: null, entity_id: null, message: "photo → 4 items", meta: { model: "claude-sonnet-5-5", ms: 3920, input_tokens: 2480, output_tokens: 201, items: 4, input: "photo" } },
  { kind: "system", level: "warn", event: "ai.extract_failed", actor_id: null, actor_email: "amir.h@example.com", entity: null, entity_id: null, message: "غذایی پیدا نکردم.", meta: { input: "text" } },
  { kind: "activity", level: "info", event: "auth.signin", actor_id: null, actor_email: "nazanin@example.com", entity: "user", entity_id: null, message: null, meta: {} },
  { kind: "activity", level: "info", event: "profile.updated", actor_id: null, actor_email: "leila.r@example.com", entity: "profiles", entity_id: null, message: null, meta: { goal: "lose", goal_kcal: 1750 } },
  { kind: "system", level: "error", event: "meal.save_failed", actor_id: null, actor_email: "babak@example.com", entity: "meal_entry", entity_id: "m-9", message: "insert into entry_items violates check constraint", meta: {} },
  { kind: "activity", level: "info", event: "auth.signup", actor_id: null, actor_email: "mahsa@example.com", entity: "user", entity_id: null, message: null, meta: {} },
  { kind: "activity", level: "info", event: "admin.user_blocked", actor_id: null, actor_email: "sara.k@example.com", entity: "user", entity_id: "mina.t", message: "mina.t@example.com", meta: {} },
  { kind: "system", level: "info", event: "settings.updated", actor_id: null, actor_email: "sara.k@example.com", entity: "setting", entity_id: "ai.anthropic.extract_model", message: null, meta: {} },
];

export const SAMPLE_LOGS: LogRow[] = Array.from({ length: 86 }, (_, i) => ({ id: 1000 - i, at: hoursAgo(i * 0.7), ...events[i % events.length]! }));
