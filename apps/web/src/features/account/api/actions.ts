"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logEvent } from "@/lib/server/log";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deleteAccountData, setNutiEnabled } from "./account.server";

async function signedInId(): Promise<string | null> {
  const { data } = await (await createClient()).auth.getUser();
  return data.user?.id ?? null;
}

/** Saves the نوتی switch on the account. Returns false when it wasn't stored. */
export async function setNutiAction(on: boolean): Promise<boolean> {
  const id = await signedInId();
  if (!id || !isAdminConfigured()) return false;
  const ok = await setNutiEnabled(id, on);
  if (!ok) return false;
  void logEvent({ kind: "activity", event: "user.nuti_toggled", actor_id: id, meta: { on, channel: "web" } });
  // The (app) layout passes the setting down; refresh it so other pages see the change.
  revalidatePath("/", "layout");
  return true;
}

export type DeleteAccountState = { error?: string };

/** Deletes the signed-in account and everything in it. The form must carry the typed word «حذف». */
export async function deleteAccountAction(_prev: DeleteAccountState, form: FormData): Promise<DeleteAccountState> {
  if (String(form.get("confirm") ?? "").trim() !== "حذف") return { error: "برای تأیید، «حذف» را بنویس." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  if (!isAdminConfigured()) return { error: "حذف حساب الان در دسترس نیست." };
  if (!(await deleteAccountData(data.user.id))) return { error: "حذف حساب انجام نشد. دوباره امتحان کن." };
  void logEvent({ kind: "activity", level: "warn", event: "user.self_deleted", actor_id: data.user.id, entity: "user", entity_id: data.user.id, meta: { channel: "web" } });
  // The auth user is gone; clear this browser's session cookies too.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}
