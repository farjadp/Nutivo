import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { Text } from "./text";

interface Props extends TextInputProps {
  label: string;
  unit?: string;
  /** Latin input (email, codes) reads left to right inside the RTL layout. */
  ltr?: boolean;
  className?: string;
}

export function Field({ label, unit, ltr = false, className = "", onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View className={`gap-1.5 ${className}`}>
      <Text className="font-strong text-sm">{label}</Text>
      <View className={`min-h-12 flex-row items-center gap-2 rounded-btn border bg-surface px-3 ${focused ? "border-green" : "border-line"}`}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColorClassName="accent-ink-2"
          cursorColorClassName="accent-green-ink"
          selectionColorClassName="accent-green"
          className={`font-body h-12 min-w-0 flex-1 text-[15px] text-ink ${ltr ? "text-left" : "text-right"}`}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {unit && <Text className="text-sm text-ink-2">{unit}</Text>}
      </View>
    </View>
  );
}
