import type { LoggedItem } from "@/entities/day/sample";

/** Stable fingerprint of a day's items; a report is stale when this changes. Runs on server and client. */
export function itemsHash(items: Pick<LoggedItem, "food" | "grams" | "meal_type">[]): string {
  const src = items
    .map((i) => `${i.meal_type}:${i.food.id}:${Math.round(i.grams)}`)
    .sort()
    .join("|");
  // FNV-1a, 32-bit: enough to detect edits, not a security hash.
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + "-" + items.length;
}
