import { toLatinDigits, toPersianDigits, type AppItem } from "@nutivo/core";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react-native";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { api } from "@/lib/api";
import { faInt } from "@/lib/format";
import { mealLabel } from "@/lib/meals";
import { useUndo } from "@/lib/undo";
import { Button } from "@/ui/button";
import { Field } from "@/ui/field";
import { FoodIconTile } from "@/ui/food-icon";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

const GRAM = "گرم";
const qtyFa = (n: number) => toPersianDigits(+n.toFixed(2)).replace(".", "٫");
const step = (q: number) => (q >= 1 ? 1 : 0.5);

function CloseButton() {
  const ink2 = useCSSVariable("--color-ink-2") as string;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="بستن" onPress={() => router.back()} className="size-11 items-center justify-center rounded-full active:bg-track">
      <X color={ink2} size={22} />
    </Pressable>
  );
}

/** Loads the item by id (so a link or a stale list can't open the wrong data), then shows the editor. */
export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<AppItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return setError("این غذا پیدا نشد.");
    void api.item(id).then((r) => (r.ok ? setItem(r.data) : setError(r.error)));
  }, [id]);
  if (item) return <EditItem item={item} />;
  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Text className="font-heavy text-[22px] leading-[34px]">ویرایش</Text>
        <CloseButton />
      </View>
      {error ? (
        <View className="gap-3">
          <Text accessibilityRole="alert" className="text-[15px] text-ink-2">{error}</Text>
          <Button variant="quiet" label="برگشت" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
        </View>
      ) : (
        <View className="items-center py-12">
          <ActivityIndicator colorClassName="accent-green-ink" />
        </View>
      )}
    </Screen>
  );
}

/** Edit amount or weight of a saved item, or delete it. New numbers are computed on the server. */
function EditItem({ item }: { item: AppItem }) {
  const { refresh } = useUndo();
  const navigation = useNavigation();
  const ink2 = useCSSVariable("--color-ink-2") as string;
  const [units, setUnits] = useState<string[]>([]);
  const [unit, setUnit] = useState(item.unit === GRAM ? GRAM : item.unit);
  const [qty, setQty] = useState(item.unit === GRAM ? 1 : item.qty);
  const [grams, setGrams] = useState(toPersianDigits(Math.round(item.grams)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Leaving with changes that weren't saved asks first (×, Android back, swipe down).
  const changed = unit !== (item.unit === GRAM ? GRAM : item.unit) || (unit === GRAM ? grams !== toPersianDigits(Math.round(item.grams)) : qty !== item.qty);
  usePreventRemove(changed && !done, ({ data }) => {
    Alert.alert("تغییرها ذخیره نشده", "اگر الان بروی، مقدار قبلی می‌ماند.", [
      { text: "ادامه ویرایش", style: "cancel" },
      { text: "بی‌خیال", style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  useEffect(() => {
    if (done && router.canGoBack()) router.back();
  }, [done]);

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
    setDone(true);
  }

  function remove() {
    Alert.alert(`حذف ${item.name}؟`, `از ${mealLabel(item.meal_type)} برداشته می‌شود.`, [
      { text: "نگه دار", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          const r = await api.itemDelete(item.id);
          setBusy(false);
          if (!r.ok) return setError(r.error);
          refresh();
          setDone(true);
        },
      },
    ]);
  }

  return (
    <Screen>
      {/* The food is the title, so the context stays once the user scrolls. */}
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-xs text-ink-2">ویرایش · {mealLabel(item.meal_type)}</Text>
          <Text accessibilityRole="header" numberOfLines={2} className="font-heavy text-[22px] leading-[34px]">{item.name}</Text>
        </View>
        <CloseButton />
      </View>

      <View className="flex-row items-center gap-3 rounded-card border border-line bg-surface p-4">
        <FoodIconTile name={item.name} estimated={item.estimated} />
        <View className="flex-1 gap-0.5">
          <Text className="font-strong text-[16px]">الان {item.estimated ? "≈ " : ""}{faInt(item.kcal)} کالری</Text>
          <Text className="text-xs text-ink-2">نوشته بودی «{item.said}»</Text>
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
                className={`min-h-11 justify-center rounded-full border px-3.5 ${on ? "border-green bg-mint" : "border-line bg-surface"}`}
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
            <Pressable accessibilityRole="button" accessibilityLabel={`کم کردن ${item.name}`} onPress={() => setQty((q) => Math.max(0.5, +(q - step(q > 1 ? q : 0.5)).toFixed(2)))} className="size-12 items-center justify-center active:bg-track">
              <Minus color={ink2} size={20} />
            </Pressable>
            <Text accessibilityLiveRegion="polite" className="min-w-16 text-center text-lg">{qtyFa(qty)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`زیاد کردن ${item.name}`} onPress={() => setQty((q) => +(q + step(q)).toFixed(2))} className="size-12 items-center justify-center active:bg-track">
              <Plus color={ink2} size={20} />
            </Pressable>
          </View>
          <Text className="text-xs leading-6 text-ink-2">وزن از جدول واحدهای همین غذا حساب می‌شود.</Text>
        </View>
      )}

      {error && <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text>}
      <Button label="ذخیره" busyLabel="در حال ذخیره…" busy={busy} disabled={unit === GRAM && !(g > 0 && g <= 5000)} onPress={save} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={remove} className="min-h-11 items-center justify-center active:opacity-70">
        <Text className="font-strong text-sm text-error">حذف {item.name}</Text>
      </Pressable>
    </Screen>
  );
}
