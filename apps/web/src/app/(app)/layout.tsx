import type { ReactNode } from "react";
import { nutiEnabledFor } from "@/features/account/api/account.server";
import { NutiPrefProvider } from "@/features/mascot/model/enabled";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAuthDisabled, isSupabaseConfigured } from "@/shared/config";

/** The signed-in user's نوتی setting, or null in review mode (then the browser keeps it). */
async function savedNuti(): Promise<boolean | null> {
  if (isAuthDisabled() || !isSupabaseConfigured() || !isAdminConfigured()) return null;
  const { data } = await (await createClient()).auth.getUser();
  return data.user ? nutiEnabledFor(data.user.id) : null;
}

/** Authenticated app shell. Bottom navigation is added with the Today screen. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <NutiPrefProvider saved={await savedNuti()}>{children}</NutiPrefProvider>
    </div>
  );
}
