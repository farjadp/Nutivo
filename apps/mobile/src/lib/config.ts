import { Platform } from "react-native";

/** The Android emulator reaches the host machine at 10.0.2.2, not localhost. */
function hostFor(url: string): string {
  if (Platform.OS !== "android") return url;
  return url.replace(/\/\/(127\.0\.0\.1|localhost)(?=[:/]|$)/, "//10.0.2.2");
}

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set. Copy apps/mobile/.env.example to .env.local.`);
  return value;
}

// EXPO_PUBLIC_* values are inlined at build time, so each is read by its full name.
export const config = {
  supabaseUrl: hostFor(required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL)),
  supabaseAnonKey: required("EXPO_PUBLIC_SUPABASE_ANON_KEY", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  apiUrl: hostFor(required("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL)),
};
