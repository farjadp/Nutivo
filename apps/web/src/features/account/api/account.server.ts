import "server-only";
import type { AppProfile } from "@nutivo/core";
import { adminClient } from "@/lib/supabase/admin";

/** Profile, goals, نوتی and Telegram link for «من» and the profile form. */
export async function accountProfile(userId: string, email: string | null): Promise<AppProfile> {
  const db = adminClient();
  const [{ data: p }, { data: link }] = await Promise.all([
    db
      .from("profiles")
      .select("sex, age, height_cm, weight_kg, activity, goal, goal_kcal, goal_protein_g, goal_carbs_g, goal_fat_g, nuti_enabled")
      .eq("id", userId)
      .maybeSingle(),
    db.from("telegram_links").select("username, first_name").eq("user_id", userId).maybeSingle(),
  ]);
  const num = (v: unknown) => (v == null ? null : Number(v));
  return {
    email,
    sex: p?.sex === "male" || p?.sex === "female" ? p.sex : null,
    age: num(p?.age),
    height_cm: num(p?.height_cm),
    weight_kg: num(p?.weight_kg),
    activity: (p?.activity as AppProfile["activity"]) ?? null,
    goal: (p?.goal as AppProfile["goal"]) ?? null,
    goals: p?.goal_kcal
      ? { kcal: Number(p.goal_kcal), protein_g: Number(p.goal_protein_g), carbs_g: Number(p.goal_carbs_g), fat_g: Number(p.goal_fat_g) }
      : null,
    nuti_enabled: p?.nuti_enabled ?? true,
    telegram: link ? (link.username ? `@${link.username}` : ((link.first_name as string | null) ?? "")) : null,
  };
}

/** Whether the user wants نوتی. On when there is no profile yet. */
export async function nutiEnabledFor(userId: string): Promise<boolean> {
  const { data } = await adminClient().from("profiles").select("nuti_enabled").eq("id", userId).maybeSingle();
  return data?.nuti_enabled ?? true;
}

export async function setNutiEnabled(userId: string, on: boolean): Promise<boolean> {
  const { error } = await adminClient().from("profiles").upsert({ id: userId, nuti_enabled: on });
  return !error;
}

/**
 * Removes the account and everything tied to it: meals, reports, Telegram link (all cascade from
 * auth.users) and meal photos in storage, which don't cascade. Activity logs stay (no foreign key).
 */
export async function deleteAccountData(userId: string): Promise<boolean> {
  const db = adminClient();
  const { data: folders } = await db.storage.from("meal-photos").list(userId, { limit: 1000 });
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return false;
  // Photos live under <user>/<date>/<file>; the first listing returns the date folders.
  for (const folder of folders ?? []) {
    const { data: files } = await db.storage.from("meal-photos").list(`${userId}/${folder.name}`, { limit: 1000 });
    if (files?.length) await db.storage.from("meal-photos").remove(files.map((f) => `${userId}/${folder.name}/${f.name}`));
  }
  return true;
}
