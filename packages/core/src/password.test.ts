import { describe, expect, it } from "vitest";
import { passwordProblem, passwordSignInErrorFa } from "./password";

describe("passwordProblem", () => {
  it("asks for 8+ characters with letters and digits", () => {
    expect(passwordProblem("abc12")).toContain("۸");
    expect(passwordProblem("abcdefgh")).toContain("عدد");
    expect(passwordProblem("12345678")).toContain("عدد");
    expect(passwordProblem("abcd1234", "abcd1235")).toContain("تکرار");
    expect(passwordProblem("abcd1234", "abcd1234")).toBeNull();
    expect(passwordProblem("شیبس۱۲۳۴۵")).toContain("کیبورد انگلیسی");
  });
});

describe("passwordSignInErrorFa", () => {
  it("points people without a password to the code", () => {
    expect(passwordSignInErrorFa({ code: "invalid_credentials", status: 400 })).toContain("با کد وارد شو");
  });
});
