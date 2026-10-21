import { Pressable, View } from "react-native";
import { Text } from "./text";

export function Chips<T extends string>({ label, value, options, onChange }: { label: string; value: T | null; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <View className="gap-2">
      <Text className="font-strong text-sm">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const on = o.v === value;
          return (
            <Pressable
              key={o.v}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onChange(o.v)}
              className={`rounded-full border px-3.5 py-2 ${on ? "border-green bg-mint" : "border-line bg-surface"}`}
            >
              <Text className={`text-sm ${on ? "font-strong text-green-ink" : ""}`}>{o.l}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
