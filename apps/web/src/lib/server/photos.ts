import "server-only";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Removes meal photos from storage once their meal or draft is gone. Storage doesn't cascade from
 * meal_entries, and the privacy page promises a deleted meal takes its photo with it.
 */
export async function removeMealPhotos(paths: (string | null | undefined)[]): Promise<void> {
  const keep = paths.filter((p): p is string => !!p);
  if (!keep.length) return;
  const { error } = await adminClient().storage.from("meal-photos").remove(keep);
  if (error) console.error("[photos] remove failed", error.message);
}
