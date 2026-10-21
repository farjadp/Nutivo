import { ActivityIndicator, Pressable, type PressableProps } from "react-native";
import { Text } from "./text";

interface Props extends Omit<PressableProps, "children"> {
  label: string;
  busyLabel?: string;
  busy?: boolean;
  variant?: "primary" | "quiet";
  className?: string;
}

export function Button({ label, busyLabel, busy = false, variant = "primary", disabled, className = "", ...props }: Props) {
  const off = disabled || busy;
  const box = variant === "primary" ? "bg-green-ink" : "bg-transparent border border-line";
  const ink = variant === "primary" ? "text-on-green" : "text-ink";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-btn px-4 py-2 active:opacity-80 ${box} ${off ? "opacity-60" : ""} ${className}`}
      {...props}
    >
      {busy && <ActivityIndicator size="small" colorClassName={variant === "primary" ? "accent-on-green" : "accent-ink"} />}
      <Text className={`font-strong text-[15px] ${ink}`}>{busy && busyLabel ? busyLabel : label}</Text>
    </Pressable>
  );
}
