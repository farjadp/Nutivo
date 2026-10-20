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
