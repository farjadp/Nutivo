import { toLatinDigits, toPersianDigits } from "./persian";

/** Sign-in by email code, the same on web and in the app. Matches otp_length / otp_expiry in Supabase config. */
export const OTP_LENGTH = 6;
export const OTP_VALID_MINUTES = 60;
/** Wait before «کد را دوباره بفرست» works again; Supabase refuses faster repeats. */
export const RESEND_SECONDS = 60;

/** The code digits from whatever was typed or pasted («۱۲۳ ۴۵۶», "Code: 123456"), at most OTP_LENGTH. */
export function otpDigits(input: string): string {
  return toLatinDigits(input).replace(/\D/g, "").slice(0, OTP_LENGTH);
}

/** «۰:۴۵» for the resend countdown. */
export function countdownFa(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return toPersianDigits(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
}

interface AuthErrorLike {
  status?: number;
  code?: string;
  name?: string;
}

const OFFLINE = "به سرور وصل نشدیم. اینترنت را چک کن و دوباره امتحان کن.";

/** Why sending the code failed, in words the user can act on. */
export function sendErrorFa(e: AuthErrorLike): string {
  if (e.status === 429 || e.code === "over_email_send_rate_limit") return "چند لحظه پیش یک کد فرستادیم؛ همان را وارد کن یا یک دقیقه صبر کن.";
  if (e.name === "AuthRetryableFetchError" || e.status === 0) return OFFLINE;
  if (e.code === "email_address_invalid" || e.status === 422) return "این ایمیل پذیرفته نشد. درست نوشته‌ای؟";
  return "ارسال کد انجام نشد. چند دقیقه بعد دوباره امتحان کن.";
}

/** Why the code was refused. The email's button uses up the same code, so say so. */
export function verifyErrorFa(e: AuthErrorLike): string {
  if (e.name === "AuthRetryableFetchError" || e.status === 0) return OFFLINE;
  if (e.status === 429) return "چند بار پشت‌سرهم امتحان شد. یک دقیقه صبر کن.";
  return "این کد درست نیست یا منقضی شده. اگر دکمه داخل ایمیل را زده‌ای، همان کد مصرف شده؛ یک کد تازه بگیر.";
}

/** How the code countdown looks and what نوتی says, by seconds left of OTP_VALID_MINUTES. */
export function codeTimerState(secondsLeft: number): { mood: "happy" | "wink" | "think" | "sleepy"; line: string; urgent: boolean } {
  if (secondsLeft <= 0) return { mood: "sleepy", line: "کدت خوابش برد! یه کد تازه بگیر.", urgent: true };
  if (secondsLeft <= 5 * 60) return { mood: "think", line: "کد داره تموم میشه، زودتر واردش کن!", urgent: true };
  if (secondsLeft <= 30 * 60) return { mood: "wink", line: "هنوز کلی وقت داری، با خیال راحت.", urgent: false };
  return { mood: "happy", line: "کدت تازه‌ست! تا یک ساعت منتظرت می‌مونه.", urgent: false };
}
