import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useCSSVariable } from "uniwind";
import { faInt } from "@/lib/format";

/** Progress ring for the day's calories. Over goal shows the full ring in the fat colour, never red. */
export function Ring({ value, goal, size = 180, label, children }: { value: number; goal: number; size?: number; label?: string; children?: ReactNode }) {
  const [green, track, over] = useCSSVariable(["--color-green", "--color-track", "--color-fat"]) as string[];
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const share = goal > 0 ? Math.min(value / goal, 1) : 0;
  return (
    <View
      className="items-center justify-center"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? "کالری امروز"}
      accessibilityValue={{ min: 0, max: goal, now: Math.round(value), text: `${faInt(value)} از ${faInt(goal)} کالری` }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {share > 0 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={value > goal ? over : green}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c * share} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        )}
      </Svg>
      <View className="absolute items-center">{children}</View>
    </View>
  );
}
