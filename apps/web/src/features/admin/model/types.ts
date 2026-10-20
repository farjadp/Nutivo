export interface AdminStats {
  users_total: number;
  users_7d: number;
  active_today: number;
  active_7d: number;
  meals_today: number;
  photo_share_7d: number;
  ai_calls_24h: number;
  errors_24h: number;
  blocked: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  status: "active" | "blocked";
  is_admin: boolean;
  goal_kcal: number | null;
  meals_total: number;
  meals_7d: number;
  last_meal_at: string | null;
}

export interface LogRow {
  id: number;
  at: string;
  kind: "activity" | "system";
  level: "debug" | "info" | "warn" | "error";
  event: string;
  actor_id: string | null;
  actor_email: string | null;
  entity: string | null;
  entity_id: string | null;
  message: string | null;
  meta: Record<string, unknown>;
}

export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  source: "live" | "sample";
}

export interface LogFilters {
  kind?: "activity" | "system";
  level?: LogRow["level"];
  event?: string;
  actor?: string;
  q?: string;
}

export const PAGE_SIZE = 20;

export interface RetentionCell {
  eligible: number;
  retained: number;
}

export interface AdminMetrics {
  today: string;
  retention: { d1: RetentionCell; d7: RetentionCell; d30: RetentionCell };
  cohorts: { week: string; size: number; d1: RetentionCell; d7: RetentionCell; d30: RetentionCell }[];
  frequency: { active_7d: number; avg_days: number; four_plus: number; histogram: { days: number; users: number }[] };
  ai: { date: string; model: string; event: string; calls: number; input_tokens: number; output_tokens: number }[];
}
