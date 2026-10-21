import { describe, expect, it } from "vitest";
import { countdownFa, otpDigits, sendErrorFa, verifyErrorFa } from "./auth";

describe("otpDigits", () => {
  it("keeps digits from pasted or Persian input", () => {
    expect(otpDigits("۱۲۳ ۴۵۶")).toBe("123456");
    expect(otpDigits("Code: 123456")).toBe("123456");
    expect(otpDigits("1234567")).toBe("123456");
    expect(otpDigits("12")).toBe("12");
  });
});

describe("countdownFa", () => {
  it("formats minutes and seconds in Persian digits", () => {
    expect(countdownFa(45)).toBe("۰:۴۵");
    expect(countdownFa(60)).toBe("۱:۰۰");
    expect(countdownFa(-3)).toBe("۰:۰۰");
  });
});

describe("auth errors", () => {
  it("names the cause", () => {
    expect(sendErrorFa({ status: 429 })).toContain("یک دقیقه صبر کن");
    expect(sendErrorFa({ name: "AuthRetryableFetchError" })).toContain("اینترنت");
    expect(verifyErrorFa({ status: 403, code: "otp_expired" })).toContain("کد تازه");
  });
});
