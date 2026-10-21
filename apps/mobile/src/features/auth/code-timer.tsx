import { codeTimerState, countdownFa, OTP_VALID_MINUTES } from "@nutivo/core";
import { MailWarning } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useCSSVariable } from "uniwind";
import { useReduceMotion } from "@/lib/motion";
import { Nuti } from "@/ui/nuti";
import { Text } from "@/ui/text";

const SIZE = 112;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const TOTAL = OTP_VALID_MINUTES * 60;

/**
 * The code's hour as a ring around نوتی that empties as time runs out. She bobs gently while there is
 * time, looks worried near the end and falls asleep when the code expires. Amber near the end, never red.
 */
export function CodeTimer({ secondsLeft }: { secondsLeft: number }) {
  const [green, fat, track] = useCSSVariable(["--color-green", "--color-fat", "--color-track"]) as string[];
  const reduce = useReduceMotion();
  const bob = useRef(new Animated.Value(0)).current;
  const s = codeTimerState(secondsLeft);
  const share = Math.max(0, Math.min(1, secondsLeft / TOTAL));

  useEffect(() => {
    if (reduce || secondsLeft <= 0) {
      bob.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, secondsLeft <= 0, bob]); // eslint-disable-line react-hooks/exhaustive-deps

  const left = Math.ceil(secondsLeft / 60);
  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={secondsLeft > 0 ? `کد تا ${left} دقیقه دیگر معتبر است` : "کد منقضی شد"}
      className="items-center gap-1"
    >
      <View className="items-center justify-center">
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={track} strokeWidth={STROKE} fill="none" />
          {share > 0 && (
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              stroke={s.urgent ? fat : green}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${C * share} ${C}`}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          )}
        </Svg>
        {/* Same layering as ui/ring.tsx: the SVG sets the size, نوتی sits on top of it. */}
        <Animated.View className="absolute" style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }}>
          <Nuti mood={s.mood} size={72} />
        </Animated.View>
      </View>
      <Text className={`font-heavy text-[28px] leading-[40px] ${s.urgent ? "text-fat-ink" : "text-green-ink"}`}>{countdownFa(Math.max(0, secondsLeft))}</Text>
      <Text className="text-center text-sm text-ink-2">{s.line}</Text>
    </View>
  );
}

/** Hard to miss: sign-in emails often land in Spam, Junk or Promotions. */
export function SpamHint() {
  const fat = useCSSVariable("--color-fat-ink") as string;
  return (
    <View accessibilityRole="alert" className="flex-row gap-3 rounded-card border border-fat/40 bg-fat/10 p-4">
      <MailWarning color={fat} size={22} />
      <View className="flex-1 gap-1">
        <Text className="font-strong text-[15px] text-fat-ink">ایمیل نیامد؟ پوشه اسپم را چک کن</Text>
        <Text className="text-[13px] leading-6 text-ink">
          گاهی ایمیل کد به Spam، Junk یا Promotions می‌رود. اگر آنجا بود، «Not spam» را بزن تا دفعه‌های بعد درست برسد.
        </Text>
      </View>
    </View>
  );
}
