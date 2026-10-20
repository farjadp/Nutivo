import { foodIconName, foodIconSvg } from "@nutivo/core";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useCSSVariable } from "uniwind";

/** Brand food icon in the mint tile; dashed outline when the amount is estimated (same as the web confirm sheet). */
export function FoodIconTile({ name, estimated = false }: { name: string; estimated?: boolean }) {
  const ink = useCSSVariable("--color-green-ink") as string;
  const xml = foodIconSvg(foodIconName({ name_fa: name }), { size: 24, stroke: ink });
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      className={`size-10 items-center justify-center rounded-btn ${estimated ? "border border-dashed border-green bg-surface" : "bg-mint"}`}
    >
      <SvgXml xml={xml} width={24} height={24} />
    </View>
  );
}
