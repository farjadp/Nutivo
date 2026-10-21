import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { Text } from "./text";

/** Title with a back button for screens pushed from «من». The chevron points right: back in RTL. */
export function BackHeader({ title, back = "من" }: { title: string; back?: string }) {
  const ink = useCSSVariable("--color-green-ink") as string;
  return (
    <View className="gap-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`برگشت به ${back}`}
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/me"))}
        hitSlop={8}
        className="-ms-2 min-h-11 flex-row items-center self-start pe-3 active:opacity-70"
      >
        <ChevronRight color={ink} size={22} />
        <Text className="text-[15px] text-green-ink">{back}</Text>
      </Pressable>
      <Text accessibilityRole="header" className="font-heavy text-[24px] leading-[38px]">{title}</Text>
    </View>
  );
}
