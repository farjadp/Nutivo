import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const SafeAreaView = withUniwind(RNSafeAreaView);

/** Full-height page on the warm ground colour, scrollable, clear of the keyboard. */
export function Screen({ children, refreshControl }: { children: ReactNode; refreshControl?: ScrollViewProps["refreshControl"] }) {
  return (
    <SafeAreaView className="flex-1 bg-ground" edges={["top", "bottom"]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView className="flex-1" contentContainerClassName="grow gap-6 px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled" refreshControl={refreshControl}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
