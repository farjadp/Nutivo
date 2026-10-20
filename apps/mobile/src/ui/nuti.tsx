import type { NutiMood } from "@nutivo/core";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { Text } from "./text";
import { NUTI_SVG } from "./nuti-svg";

export function Nuti({ mood = "happy", size = 64 }: { mood?: NutiMood; size?: number }) {
  return <SvgXml xml={NUTI_SVG[mood]} width={size} height={size} accessibilityLabel="نوتی" />;
}

/** نوتی with a speech bubble, in Nutivo's purple (what Nutivo analyses). */
export function NutiSays({ mood, text }: { mood: NutiMood; text: string }) {
  return (
    <View accessibilityRole="text" className="flex-row items-center gap-3 rounded-card bg-purple-tint p-3">
      <Nuti mood={mood} size={56} />
      <Text className="flex-1 text-[14px] leading-7 text-purple-ink">{text}</Text>
    </View>
  );
}
