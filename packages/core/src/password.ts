/**
 * Optional password, set after a code sign-in. Matches minimum_password_length and
 * password_requirements ("letters_digits") in the Supabase auth config.
 */
export const PASSWORD_MIN = 8;

/** What is still wrong with a new password, in Persian, or null when it is fine. */
export function passwordProblem(pw: string, repeat?: string): string | null {
  // A Persian keyboard is the usual cause of letters-and-digits failing, so name it first.
  if (/[؀-ۿ]/.test(pw)) return "رمز را با کیبورد انگلیسی بنویس.";
  if (pw.length < PASSWORD_MIN) return "دست‌کم ۸ کاراکتر باشد.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "هم حرف انگلیسی داشته باشد، هم عدد.";
  if (repeat !== undefined && repeat !== pw) return "تکرار رمز با خودش یکی نیست.";
  return null;
}

interface AuthErrorLike {
  status?: number;
  code?: string;
  message?: string;
}

/** Why a password sign-in failed. Supabase says "invalid credentials" both for a wrong password and for no password. */
export function passwordSignInErrorFa(e: AuthErrorLike): string {
  if (e.status === 429) return "چند بار پشت‌سرهم امتحان شد. یک دقیقه صبر کن.";
  if (e.code === "invalid_credentials" || e.status === 400)
    return "ایمیل یا رمز درست نیست. اگر هنوز رمز نگذاشته‌ای، با کد وارد شو و از «من» یک رمز بگذار.";
  return "ورود انجام نشد. دوباره امتحان کن.";
}

/** Why saving a new password failed. */
export function setPasswordErrorFa(e: AuthErrorLike): string {
  if (e.code === "weak_password") return "این رمز خیلی ساده است. ترکیب طولانی‌تری از حرف و عدد امتحان کن.";
  if (e.code === "same_password") return "رمز تازه با رمز قبلی یکی است.";
  if (e.code === "reauthentication_needed") return "برای عوض کردن رمز، یک بار خارج شو و با کد وارد شو.";
  return "رمز ذخیره نشد. دوباره امتحان کن.";
}
