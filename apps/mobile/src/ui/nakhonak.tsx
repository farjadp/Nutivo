import type { NakhonakMood } from "@nutivo/core";
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useReduceMotion } from "@/lib/motion";
import { nakhonakLayers } from "./nakhonak-svg";

const ease = Easing.out(Easing.cubic);
const sine = Easing.inOut(Easing.sin);

/** A breathing loop between 0 and 1. */
function pingPong(v: Animated.Value, ms: number) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: sine, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: sine, useNativeDriver: true }),
    ]),
  );
}

/**
 * ناخنک, animated with the RN Animated API (native driver), ease-out and sine only, no bounce:
 * - always: breathes, the cape sways, the eyes blink;
 * - telling: the scroll wags as he tells the story;
 * - when the mood changes: beaten slumps, smug tilts back and rises, the rest settle.
 * It slides in on mount. Reduce Motion turns every loop and transition off.
 */
export function Nakhonak({ mood = "sly", size = 88 }: { mood?: NakhonakMood; size?: number }) {
  const reduce = useReduceMotion();
  const layers = nakhonakLayers(mood);

  const enter = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const wag = useRef(new Animated.Value(0)).current;
  const pose = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) {
      enter.setValue(1);
      return;
    }
    Animated.timing(enter, { toValue: 1, duration: 360, easing: ease, useNativeDriver: true }).start();
  }, [reduce, enter]);

  useEffect(() => {
    if (reduce) {
      breathe.setValue(0);
      sway.setValue(0.5);
      blink.setValue(1);
      return;
    }
    const loops = [pingPong(breathe, 1600), pingPong(sway, 1300)];
    loops.forEach((l) => l.start());
    let t: ReturnType<typeof setTimeout>;
    const blinkOnce = () => {
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.1, duration: 70, easing: ease, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 110, easing: ease, useNativeDriver: true }),
      ]).start();
      t = setTimeout(blinkOnce, 3400 + Math.random() * 2400);
    };
    t = setTimeout(blinkOnce, 1800);
    return () => {
      loops.forEach((l) => l.stop());
      clearTimeout(t);
    };
  }, [reduce, breathe, sway, blink]);

  useEffect(() => {
    if (reduce || mood !== "telling") {
      wag.setValue(0.5);
      return;
    }
    const l = pingPong(wag, 700);
    l.start();
    return () => l.stop();
  }, [reduce, mood, wag]);

  // One-shot pose when the mood changes: 0 is neutral, 1 is the mood's pose.
  useEffect(() => {
    pose.setValue(0);
    if (mood !== "beaten" && mood !== "smug") return;
    if (reduce) {
      pose.setValue(1);
      return;
    }
    Animated.timing(pose, { toValue: 1, duration: 420, easing: ease, useNativeDriver: true }).start();
  }, [reduce, mood, pose]);

  const tilt = mood === "beaten" ? "-5deg" : mood === "smug" ? "5deg" : "0deg";
  const lift = mood === "beaten" ? size * 0.04 : mood === "smug" ? -size * 0.025 : 0;

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel="ناخنک"
      style={{
        width: size,
        height: size,
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [size * 0.15, 0] }) }],
      }}
    >
      <Animated.View
        className="absolute inset-0"
        style={{ transformOrigin: "50% 55%", transform: [{ rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ["-2.5deg", "2.5deg"] }) }] }}
      >
        <SvgXml xml={layers.cape} width={size} height={size} />
      </Animated.View>
      <Animated.View
        className="absolute inset-0"
        style={{
          transformOrigin: "50% 95%",
          transform: [
            { translateY: pose.interpolate({ inputRange: [0, 1], outputRange: [0, lift] }) },
            { rotate: pose.interpolate({ inputRange: [0, 1], outputRange: ["0deg", tilt] }) },
            { scaleY: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
          ],
        }}
      >
        <SvgXml xml={layers.body} width={size} height={size} />
        <Animated.View className="absolute inset-0" style={{ transformOrigin: "50% 56%", transform: [{ scaleY: blink }] }}>
          <SvgXml xml={layers.eyes} width={size} height={size} />
        </Animated.View>
        <View className="absolute inset-0">
          <SvgXml xml={layers.face} width={size} height={size} />
        </View>
      </Animated.View>
      {layers.hand && (
        <Animated.View
          className="absolute inset-0"
          style={{ transformOrigin: "72% 76%", transform: [{ rotate: wag.interpolate({ inputRange: [0, 1], outputRange: ["-7deg", "6deg"] }) }] }}
        >
          <SvgXml xml={layers.hand} width={size} height={size} />
        </Animated.View>
      )}
    </Animated.View>
  );
}
