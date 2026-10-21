import type { DayView } from "@nutivo/core";
import { RotateCcw } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { api } from "@/lib/api";
import { mealLabel } from "@/lib/meals";
import { useUndo } from "@/lib/undo";
import { Text } from "@/ui/text";

/** One-tap repeats of the user's own usual meals (same foods and amounts), logged now with the undo toast. */
export function QuickRepeats({ repeats }: { repeats: DayView["repeats"] }) {
  const { saved } = useUndo();
  const green = useCSSVariable("--color-green-ink") as string;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!repeats.length) return null;

  async function add(id: string, label: string) {
    setBusy(id);
    setError(null);
    const r = await api.repeat(id);
    setBusy(null);
    if (!r.ok) return setError(r.error);
    saved({ entryId: r.data.entry_id, label });
  }

  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="text-xs text-ink-2">مثل همیشه، با یک ضربه</Text>
      <View className="flex-row flex-wrap gap-2">
        {repeats.map((r) => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={`ثبت دوباره: ${r.label}، ${mealLabel(r.meal_type)}`}
            accessibilityState={{ disabled: busy !== null, busy: busy === r.id }}
            disabled={busy !== null}
            onPress={() => void add(r.id, r.label)}
            className="min-h-11 flex-row items-center gap-2 rounded-full border border-line bg-surface px-3.5 active:bg-mint"
          >
            {busy === r.id ? <ActivityIndicator size="small" colorClassName="accent-green-ink" /> : <RotateCcw color={green} size={15} />}
            <Text className="text-sm">{r.label}</Text>
            {/* «شام دیروز» already names the meal. */}
            {!r.label.includes(mealLabel(r.meal_type)) && <Text className="text-xs text-ink-2">{mealLabel(r.meal_type)}</Text>}
          </Pressable>
        ))}
      </View>
      {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}
    </View>
  );
}
