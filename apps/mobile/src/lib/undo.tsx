import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/ui/text";
import { api } from "./api";

interface Saved {
  entryId: string;
  label: string;
}

interface UndoState {
  /** Show «ثبت شد» with a «برگردان» button for a few seconds. */
  saved: (s: Saved) => void;
  /** Bumped after a meal is saved, edited or undone, so screens can reload. */
  version: number;
  /** Ask screens to reload (after an edit or delete). */
  refresh: () => void;
  /** Entry id of the last meal taken back with «برگردان», so a screen can drop its «ثبت شد». */
  lastUndone: string | null;
}

interface ToastState {
  item: Saved | null;
  msg: string | null;
  fade: Animated.Value;
  undo: () => Promise<void>;
}

const Ctx = createContext<UndoState | null>(null);
/** Read only by <UndoToast />, which a navigator layout renders (see below). */
const ToastCtx = createContext<ToastState | null>(null);
const SHOW_MS = 8000;
/** With VoiceOver/TalkBack on, reaching the button takes longer (WCAG 2.2.1). */
const SHOW_MS_SCREEN_READER = 20000;
/** Clears the tab bar (49pt) with a small gap; the toast shows over the tabs after a save. */
const TAB_BAR = 60;

export function UndoProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<Saved | null>(null);
  const [version, setVersion] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastUndone, setLastUndone] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setItem(null);
      setMsg(null);
    });
  }, [fade]);

  const show = useCallback(
    (s: Saved) => {
      if (timer.current) clearTimeout(timer.current);
      setItem(s);
      setMsg(null);
      setVersion((v) => v + 1);
      Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      AccessibilityInfo.announceForAccessibility(`ثبت شد: ${s.label}`);
      void AccessibilityInfo.isScreenReaderEnabled().then((sr) => {
        timer.current = setTimeout(hide, sr ? SHOW_MS_SCREEN_READER : SHOW_MS);
      });
    },
    [fade, hide],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function undo() {
    if (!item) return;
    if (timer.current) clearTimeout(timer.current);
    const r = await api.undo(item.entryId);
    setVersion((v) => v + 1);
    setMsg(r.ok ? "برگشت." : r.error);
    if (r.ok) setLastUndone(item.entryId);
    timer.current = setTimeout(hide, 2500);
  }

  return (
    <Ctx.Provider value={{ saved: show, version, refresh: () => setVersion((v) => v + 1), lastUndone }}>
      <ToastCtx.Provider value={{ item, msg, fade, undo }}>{children}</ToastCtx.Provider>
    </Ctx.Provider>
  );
}

/**
 * The «ثبت شد · برگردان» bar. It is drawn by the tabs layout, not here at the root: a view placed beside
 * the native screen stack shows on top but iOS hands its touches to the screen underneath.
 */
export function UndoToast() {
  const t = useContext(ToastCtx);
  const insets = useSafeAreaInsets();
  if (!t?.item) return null;
  const { item, msg, fade, undo } = t;
  return (
    <Animated.View pointerEvents="box-none" className="absolute inset-x-4" style={{ opacity: fade, bottom: insets.bottom + TAB_BAR }}>
      <View accessibilityLiveRegion="polite" className="min-h-12 flex-row items-center justify-between gap-3 rounded-card bg-ink py-1 ps-4 pe-2">
        <Text className="flex-1 text-sm text-ground">{msg ?? `ثبت شد: ${item.label}`}</Text>
        {!msg && (
          <Pressable accessibilityRole="button" accessibilityLabel={`برگرداندن ${item.label}`} onPress={() => void undo()} className="min-h-11 justify-center rounded-btn px-4 active:opacity-70">
            <Text className="font-strong text-sm text-mint">برگردان</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export function useUndo(): UndoState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUndo outside UndoProvider");
  return v;
}
