import type { AppDay } from "@nutivo/core";
import { Pressable, ScrollView, View } from "react-native";
import { faDayLabel, faDayNumber, faWeekdayInitial } from "@/lib/format";
import { Text } from "@/ui/text";

/**
 * The last three weeks, newest first: today sits at the right edge (where an RTL reader starts)
 * and older days continue to the left, so the strip opens on today without scrolling.
 */
export function DayStrip({ strip, today, selected, onSelect }: { strip: AppDay["strip"]; today: string; selected: string; onSelect: (d: string) => void }) {
  const days = [...strip].reverse();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5" contentContainerClassName="gap-1.5 px-5">
      {days.map((d) => {
        const on = d.date === selected;
        const isToday = d.date === today;
        const mark = d.complete ? "، روز کامل" : d.logged ? "، ثبت شده" : "";
        return (
          <Pressable
            key={d.date}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${isToday ? "امروز" : faDayLabel(d.date)}${mark}`}
            onPress={() => onSelect(d.date)}
            className={`h-[68px] w-11 items-center justify-center gap-1 rounded-[14px] border ${on ? "border-green-ink bg-green-ink" : isToday ? "border-green bg-surface" : "border-transparent"}`}
          >
            <Text className={`text-[11px] ${on ? "text-on-green" : "text-ink-2"}`}>{faWeekdayInitial(d.date)}</Text>
            <Text className={`font-strong text-[15px] ${on ? "text-on-green" : ""}`}>{faDayNumber(d.date)}</Text>
            <View className={`size-1.5 rounded-full ${d.complete ? (on ? "bg-surface" : "bg-green") : d.logged ? (on ? "bg-mint" : "bg-mint border border-green") : "bg-transparent"}`} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
