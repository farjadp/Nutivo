import "server-only";
import { notFound, redirect } from "next/navigation";
import { adminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAuthDisabled, isSupabaseConfigured } from "@/shared/config";

export interface AdminContext {
  /** review: dev without login · admin: signed-in admin */
  mode: "review" | "admin";
  userId: string | null;
  email: string | null;
  /** Service role available: real data and actions. Otherwise sample data, actions disabled. */
  live: boolean;
}

function envAdmins(): string[] {
  return (process.env.NUTIVO_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/** Gate for every admin page and action. Non-admins get a 404, not a hint that /admin exists. */
export async function requireAdmin(): Promise<AdminContext> {
  const live = isAdminConfigured();
  if (isAuthDisabled()) return { mode: "review", userId: null, email: null, live };
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const email = user.email?.toLowerCase() ?? "";
  let allowed = envAdmins().includes(email);
  if (!allowed && live) {
    const { data: row } = await adminClient().from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
    allowed = Boolean(row);
  }
  if (!allowed) notFound();
  return { mode: "admin", userId: user.id, email: user.email ?? null, live };
}

export function actorOf(ctx: AdminContext) {
  return { actor_id: ctx.userId, actor_email: ctx.email ?? (ctx.mode === "review" ? "review-mode" : null) };
}
