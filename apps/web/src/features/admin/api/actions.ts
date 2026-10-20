"use server";
import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logEvent } from "@/lib/server/log";
import { canEncrypt, encryptSecret, last4 } from "@/lib/server/secrets";
import { getSecret, invalidateSettings, SETTING_KEYS } from "@/lib/server/settings";
import { adminClient } from "@/lib/supabase/admin";
import { actorOf, requireAdmin, type AdminContext } from "./guard.server";

export type AdminResult = { ok: true; message: string } | { ok: false; error: string };

const NEED_SERVICE = "برای این کار SUPABASE_SERVICE_ROLE_KEY باید در apps/web/.env.local تنظیم شود.";
const Uuid = z.string().uuid();

async function liveAdmin(): Promise<AdminContext | AdminResult> {
  const ctx = await requireAdmin();
  if (!ctx.live) return { ok: false, error: NEED_SERVICE };
  return ctx;
}
const isResult = (x: AdminContext | AdminResult): x is AdminResult => "ok" in x;

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function setAdminRoleAction(userId: string, makeAdmin: boolean): Promise<AdminResult> {
  const ctx = await liveAdmin();
  if (isResult(ctx)) return ctx;
  if (!Uuid.safeParse(userId).success) return { ok: false, error: "شناسه کاربر معتبر نیست." };
  if (userId === ctx.userId && !makeAdmin) return { ok: false, error: "نمی‌توانی دسترسی ادمین خودت را برداری." };
  const db = adminClient();
  const { error } = makeAdmin
    ? await db.from("admin_users").upsert({ user_id: userId, granted_by: ctx.userId })
    : await db.from("admin_users").delete().eq("user_id", userId);
  if (error) return { ok: false, error: "تغییر نقش انجام نشد." };
  await logEvent({ kind: "activity", event: makeAdmin ? "admin.role_granted" : "admin.role_revoked", ...actorOf(ctx), entity: "user", entity_id: userId });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: makeAdmin ? "دسترسی ادمین داده شد." : "دسترسی ادمین برداشته شد." };
}

export async function setUserBlockedAction(userId: string, blocked: boolean): Promise<AdminResult> {
  const ctx = await liveAdmin();
  if (isResult(ctx)) return ctx;
  if (!Uuid.safeParse(userId).success) return { ok: false, error: "شناسه کاربر معتبر نیست." };
  if (userId === ctx.userId) return { ok: false, error: "نمی‌توانی حساب خودت را مسدود کنی." };
  const db = adminClient();
  const { error: aErr } = await db.auth.admin.updateUserById(userId, { ban_duration: blocked ? "876000h" : "none" });
  if (aErr) return { ok: false, error: "تغییر وضعیت ورود انجام نشد." };
  const { error: pErr } = await db.from("profiles").upsert({ id: userId, status: blocked ? "blocked" : "active" });
  if (pErr) return { ok: false, error: "تغییر وضعیت پروفایل انجام نشد." };
  await logEvent({ kind: "activity", event: blocked ? "admin.user_blocked" : "admin.user_unblocked", ...actorOf(ctx), entity: "user", entity_id: userId });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: blocked ? "کاربر مسدود شد و دیگر نمی‌تواند وارد شود." : "مسدودیت برداشته شد." };
}

export async function deleteUserAction(userId: string, typedEmail: string): Promise<AdminResult> {
  const ctx = await liveAdmin();
  if (isResult(ctx)) return ctx;
  if (!Uuid.safeParse(userId).success) return { ok: false, error: "شناسه کاربر معتبر نیست." };
  if (userId === ctx.userId) return { ok: false, error: "نمی‌توانی حساب خودت را حذف کنی." };
  const db = adminClient();
  const { data } = await db.auth.admin.getUserById(userId);
  const email = data.user?.email ?? "";
  if (!email || email.toLowerCase() !== typedEmail.trim().toLowerCase()) return { ok: false, error: "ایمیل واردشده با ایمیل کاربر یکی نیست." };
  const { data: photos } = await db.storage.from("meal-photos").list(userId, { limit: 1000 });
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: "حذف کاربر انجام نشد." };
  if (photos?.length) {
    // Photos live under <user>/<date>/<file>; list returns the date folders.
    for (const folder of photos) {
      const { data: files } = await db.storage.from("meal-photos").list(`${userId}/${folder.name}`, { limit: 1000 });
      if (files?.length) await db.storage.from("meal-photos").remove(files.map((f) => `${userId}/${folder.name}/${f.name}`));
    }
  }
  await logEvent({ kind: "activity", level: "warn", event: "admin.user_deleted", ...actorOf(ctx), entity: "user", entity_id: userId, message: email });
  revalidatePath("/admin/users");
  return { ok: true, message: "کاربر و همه داده‌هایش حذف شد." };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const SECRET_KEYS = [SETTING_KEYS.anthropicKey, SETTING_KEYS.openaiKey, SETTING_KEYS.googleKey] as const;
const VALUE_KEYS = [SETTING_KEYS.anthropicExtractModel, SETTING_KEYS.anthropicReportModel, SETTING_KEYS.openaiTranscribeModel, SETTING_KEYS.reportHour] as const;

export async function saveSecretAction(key: string, value: string): Promise<AdminResult> {
  const ctx = await liveAdmin();
  if (isResult(ctx)) return ctx;
  if (!(SECRET_KEYS as readonly string[]).includes(key)) return { ok: false, error: "کلید ناشناخته." };
  if (!canEncrypt()) return { ok: false, error: "NUTIVO_SECRETS_KEY تنظیم نشده؛ ذخیره امن ممکن نیست." };
  const v = value.trim();
  if (v.length < 16 || v.length > 400 || /\s/.test(v)) return { ok: false, error: "قالب کلید درست به نظر نمی‌رسد." };
  const { error } = await adminClient().from("app_settings").upsert({
    key,
    value: null,
    secret_ciphertext: encryptSecret(v),
    secret_last4: last4(v),
    updated_at: new Date().toISOString(),
    updated_by: ctx.userId,
  });
  if (error) return { ok: false, error: "ذخیره کلید انجام نشد." };
  invalidateSettings();
  await logEvent({ kind: "system", event: "settings.secret_saved", ...actorOf(ctx), entity: "setting", entity_id: key, message: `…${last4(v)}` });
  revalidatePath("/admin/settings");
  return { ok: true, message: "کلید ذخیره شد." };
}

export async function clearSecretAction(key: string): Promise<AdminResult> {
  const ctx = await liveAdmin();
  if (isResult(ctx)) return ctx;
  if (!(SECRET_KEYS as readonly string[]).includes(key)) return { ok: false, error: "کلید ناشناخته." };
  const { error } = await adminClient().from("app_settings").delete().eq("key", key);
  if (error) return { ok: false, error: "حذف کلید انجام نشد." };
  invalidateSettings();
  await logEvent({ kind: "system", level: "warn", event: "settings.secret_removed", ...actorOf(ctx), entity: "setting", entity_id: key });
  revalidatePath("/admin/settings");
  return { ok: true, message: "کلید حذف شد. اگر در .env.local کلیدی باشد، از آن استفاده می‌شود." };
}

export async function saveValueAction(key: string, value: string): Promise<AdminResult> {
  const ctx = await liveAdmin();
  if (isResult(ctx)) return ctx;
  if (!(VALUE_KEYS as readonly string[]).includes(key)) return { ok: false, error: "تنظیم ناشناخته." };
  let parsed: string | number = value.trim();
  if (key === SETTING_KEYS.reportHour) {
    const n = Number(parsed);
    if (!Number.isInteger(n) || n < 0 || n > 23) return { ok: false, error: "ساعت باید بین ۰ تا ۲۳ باشد." };
    parsed = n;
  } else if (!/^[a-z0-9][a-z0-9._-]{1,80}$/i.test(parsed)) return { ok: false, error: "نام مدل معتبر نیست." };
  const { error } = await adminClient().from("app_settings").upsert({ key, value: parsed, secret_ciphertext: null, secret_last4: null, updated_at: new Date().toISOString(), updated_by: ctx.userId });
  if (error) return { ok: false, error: "ذخیره انجام نشد." };
  invalidateSettings();
  await logEvent({ kind: "system", event: "settings.updated", ...actorOf(ctx), entity: "setting", entity_id: key, message: String(parsed) });
  revalidatePath("/admin/settings");
  return { ok: true, message: "ذخیره شد." };
}

/** Minimal authenticated call per provider. Does not spend model tokens. */
export async function testProviderAction(provider: "anthropic" | "openai" | "google"): Promise<AdminResult> {
  const ctx = await requireAdmin();
  const map = {
    anthropic: [SETTING_KEYS.anthropicKey, "ANTHROPIC_API_KEY"],
    openai: [SETTING_KEYS.openaiKey, "OPENAI_API_KEY"],
    google: [SETTING_KEYS.googleKey, "GOOGLE_API_KEY"],
  } as const;
  const [k, envName] = map[provider];
  const key = await getSecret(k, envName);
  if (!key) return { ok: false, error: "کلیدی تنظیم نشده." };
  const t0 = Date.now();
  try {
    if (provider === "anthropic") {
      const page = await new Anthropic({ apiKey: key }).models.list({ limit: 1 });
      if (!page.data) throw new Error("no models");
    } else if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } else {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": key } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }
    await logEvent({ kind: "system", event: `ai.test_ok`, ...actorOf(ctx), entity: "provider", entity_id: provider, meta: { ms: Date.now() - t0 } });
    return { ok: true, message: `اتصال برقرار است (${Date.now() - t0}ms).` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logEvent({ kind: "system", level: "warn", event: `ai.test_failed`, ...actorOf(ctx), entity: "provider", entity_id: provider, message: msg });
    return { ok: false, error: `اتصال ناموفق: ${msg}` };
  }
}
