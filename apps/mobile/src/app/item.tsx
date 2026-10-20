import { toLatinDigits, toPersianDigits, type AppItem } from "@nutivo/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { api } from "@/lib/api";
import { faInt } from "@/lib/format";
import { useUndo } from "@/lib/undo";
import { Button } from "@/ui/button";
import { Field } from "@/ui/field";
import { FoodIconTile } from "@/ui/food-icon";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

const GRAM = "گرم";
const qtyFa = (n: number) => toPersianDigits(+n.toFixed(2)).replace(".", "٫");
const step = (q: number) => (q >= 1 ? 1 : 0.5);

/** Edit amount or weight of a saved item, or delete it. New numbers are computed on the server. */
export default function EditItem() {
  const { item: raw } = useLocalSearchParams<{ item: string }>();
  const item = JSON.parse(raw) as AppItem;
  const { refresh } = useUndo();
  const [units, setUnits] = useState<string[]>([]);
  const [unit, setUnit] = useState(item.unit === GRAM ? GRAM : item.unit);
  const [qty, setQty] = useState(item.unit === GRAM ? 1 : item.qty);
  const [grams, setGrams] = useState(toPersianDigits(Math.round(item.grams)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.units(item.food_id).then((r) => r.ok && setUnits(r.data));
  }, [item.food_id]);

  const options = [...new Set([...units, ...(item.unit !== GRAM ? [item.unit] : []), GRAM])];
  const g = Number(toLatinDigits(grams).replace("٫", "."));

  async function save() {
    setBusy(true);
    setError(null);
    const r = await api.itemUpdate(item.id, unit === GRAM ? { grams: g } : { qty, unit });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    refresh();
    router.back();
  }

  function remove() {
    Alert.alert(`حذف ${item.name}؟`, "این آیتم از وعده برداشته می‌شود.", [
      { text: "انصراف", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          const r = await api.itemDelete(item.id);
          setBusy(false);
          if (!r.ok) return setError(r.error);
          refresh();
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Text className="font-heavy text-[22px] leading-[34px]">ویرایش</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="بستن" onPress={() => router.back()} className="size-10 items-center justify-center rounded-full active:bg-track">
          <Text className="text-xl text-ink-2">×</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3 rounded-card border border-line bg-surface p-4">
        <FoodIconTile name={item.name} estimated={item.estimated} />
        <View className="flex-1 gap-0.5">
          <Text className="font-strong text-[16px]">{item.name}</Text>
          <Text className="text-xs text-ink-2">«{item.said}» · الان {item.estimated ? "≈ " : ""}{faInt(item.kcal)} کالری</Text>
        </View>
      </View>

      <View className="gap-2">
        <Text className="font-strong text-sm">واحد</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="واحد" className="flex-row flex-wrap gap-2">
          {options.map((u) => {
            const on = u === unit;
            return (
              <Pressable
                key={u}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setUnit(u)}
                className={`rounded-full border px-3.5 py-2 ${on ? "border-green bg-mint" : "border-line bg-surface"}`}
              >
                <Text className={`text-sm ${on ? "font-strong text-green-ink" : ""}`}>{u}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {unit === GRAM ? (
        <Field label="وزن" unit="گرم" value={grams} onChangeText={setGrams} keyboardType="number-pad" maxLength={5} />
      ) : (
        <View className="gap-2">
          <Text className="font-strong text-sm">مقدار</Text>
          <View className="flex-row items-center self-start overflow-hidden rounded-btn border border-line bg-surface">
            <Pressable accessibilityRole="button" accessibilityLabel="کم کن" onPress={() => setQty((q) => Math.max(0.5, +(q - step(q > 1 ? q : 0.5)).toFixed(2)))} className="size-12 items-center justify-center active:bg-track">
              <Text className="font-strong text-xl text-ink-2">−</Text>
            </Pressable>
            <Text className="min-w-16 text-center text-lg">{qtyFa(qty)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="زیاد کن" onPress={() => setQty((q) => +(q + step(q)).toFixed(2))} className="size-12 items-center justify-center active:bg-track">
              <Text className="font-strong text-xl text-ink-2">+</Text>
            </Pressable>
          </View>
          <Text className="text-xs leading-6 text-ink-2">وزن از جدول واحدهای همین غذا حساب می‌شود.</Text>
        </View>
      )}

      {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}
      <Button label="ذخیره" busyLabel="در حال ذخیره…" busy={busy} disabled={unit === GRAM && !(g > 0 && g <= 5000)} onPress={save} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={remove} className="items-center py-3 active:opacity-70">
        <Text className="font-strong text-sm text-error">حذف این غذا</Text>
      </Pressable>
    </Screen>
  );
}
