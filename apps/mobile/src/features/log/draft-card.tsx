import type { DraftItemView, DraftView } from "@nutivo/core";
import { toLatinDigits, toPersianDigits } from "@nutivo/core";
import { Minus, Plus, X } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useCSSVariable } from "uniwind";
import type { DraftChange } from "@/lib/api";
import { MEALS } from "@/lib/meals";
import { FoodIconTile } from "@/ui/food-icon";
import { Text } from "@/ui/text";

const fa = (n: number) => toPersianDigits(Math.round(n));
const qtyFa = (n: number) => toPersianDigits(+n.toFixed(2)).replace(".", "٫");

function Step({ label, icon, onPress, disabled }: { label: string; icon: ReactNode; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} className="size-11 items-center justify-center active:bg-track">
      {icon}
    </Pressable>
  );
}

function GramsInput({ onSubmit, disabled }: { onSubmit: (g: number) => void; disabled?: boolean }) {
  const [v, setV] = useState("");
  const n = Number(toLatinDigits(v).replace("٫", "."));
  const ok = Number.isFinite(n) && n > 0 && n <= 5000;
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-xs text-ink-2">وزن:</Text>
      <TextInput
        accessibilityLabel="وزن به گرم"
        value={v}
        onChangeText={setV}
        keyboardType="number-pad"
        placeholder="گرم"
        placeholderTextColorClassName="accent-ink-2"
        returnKeyType="done"
        onSubmitEditing={() => ok && onSubmit(n)}
        className="font-body h-11 w-20 rounded-btn border border-fat bg-surface px-2 text-center text-[15px] text-ink"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !ok || disabled }}
        disabled={!ok || disabled}
        onPress={() => onSubmit(n)}
        className={`min-h-11 justify-center rounded-btn px-3 ${ok ? "bg-mint" : "bg-track"}`}
      >
        <Text className={`font-strong text-sm ${ok ? "text-green-ink" : "text-ink"}`}>ثبت وزن</Text>
      </Pressable>
    </View>
  );
}

function Item({ it, busy, onChange }: { it: DraftItemView; busy: boolean; onChange: (c: DraftChange) => void }) {
  const ink2 = useCSSVariable("--color-ink-2") as string;
  const name = it.food ?? it.said;
  const needsGrams = it.grams == null || Boolean(it.question);
  return (
    <View className={`gap-2.5 rounded-card border bg-surface p-3 ${it.question || !it.food ? "border-fat" : "border-line"}`}>
      <View className="flex-row items-start gap-3">
        <FoodIconTile name={it.food ?? it.said} estimated={it.estimated} />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-strong text-[15px]">{it.food ?? `«${it.said}» پیدا نشد`}</Text>
          <Text className="text-xs text-ink-2">«{it.said}»</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`حذف ${name}`} disabled={busy} onPress={() => onChange({ op: "remove", idx: it.idx })} className="-me-2 -mt-1 size-11 items-center justify-center rounded-full active:bg-track">
          <X color={ink2} size={20} />
        </Pressable>
      </View>

      {it.question && (
        <View className="rounded-btn bg-fat/10 px-3 py-2">
          <Text className="text-[13px] leading-6">{it.question}</Text>
        </View>
      )}

      {it.food && (
        <View className="flex-row flex-wrap items-center gap-2">
          <View className="flex-row items-center overflow-hidden rounded-btn border border-line">
            {/* Screen readers hear which food changes and its new amount, not just «کم کن» on every row. */}
            <Step label={`کم کردن ${name}`} icon={<Minus color={ink2} size={18} />} disabled={busy} onPress={() => onChange({ op: "dec", idx: it.idx })} />
            <Text accessibilityLabel={`${qtyFa(it.qty)} ${it.unit} ${name}`} className="min-w-12 text-center text-[15px]">{qtyFa(it.qty)}</Text>
            <Step label={`زیاد کردن ${name}`} icon={<Plus color={ink2} size={18} />} disabled={busy} onPress={() => onChange({ op: "inc", idx: it.idx })} />
          </View>
          <Text className="text-sm text-ink-2">{it.unit}</Text>
          {it.grams != null && <Text className="text-xs text-ink-2">{it.estimated ? "≈ " : ""}{fa(it.grams)} گرم</Text>}
          <Text className="font-strong ms-auto text-sm">{it.kcal != null ? `${it.estimated ? "≈ " : ""}${fa(it.kcal)} کالری` : "—"}</Text>
        </View>
      )}
      {it.food && needsGrams && <GramsInput disabled={busy} onSubmit={(g) => onChange({ op: "grams", idx: it.idx, grams: g })} />}
    </View>
  );
}

/** The confirmation step: same rules as the web sheet and the Telegram card. Numbers come only from the server. */
export function DraftCard({ draft, busy, onChange }: { draft: DraftView; busy: boolean; onChange: (c: DraftChange) => void }) {
  return (
    <View className="gap-4">
      <View accessibilityRole="radiogroup" accessibilityLabel="نوع وعده" className="flex-row gap-2">
        {MEALS.map((m) => {
          const on = m.v === draft.meal_type;
          return (
            <Pressable
              key={m.v}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              disabled={busy}
              onPress={() => !on && onChange({ op: "meal", meal_type: m.v })}
              className={`min-h-11 flex-1 items-center justify-center rounded-full border ${on ? "border-green bg-mint" : "border-line bg-surface"}`}
            >
              <Text className={`text-sm ${on ? "font-strong text-green-ink" : ""}`}>{m.l}</Text>
            </Pressable>
          );
        })}
      </View>

      <View className="gap-2">
        {draft.items.map((it) => (
          <Item key={`${it.idx}-${it.said}`} it={it} busy={busy} onChange={onChange} />
        ))}
        {draft.items.length === 0 && <Text className="text-center text-sm text-ink-2">همه آیتم‌ها حذف شد.</Text>}
      </View>

      <View className="flex-row rounded-card bg-surface py-3">
        {(
          [
            ["کالری", draft.totals.kcal, "text-ink"],
            ["پروتئین", draft.totals.protein_g, "text-purple-ink"],
            ["کربو", draft.totals.carbs_g, "text-carbs"],
            ["چربی", draft.totals.fat_g, "text-fat-ink"],
          ] as const
        ).map(([l, v, c]) => (
          <View key={l} className="flex-1 items-center gap-0.5">
            <Text className="text-xs text-ink-2">{l}</Text>
            <Text className={`font-strong text-base ${c}`}>{l === "کالری" && draft.estimated ? "≈" : ""}{fa(v)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
