import { describe, expect, it } from "vitest";
import { msUntilNextRun } from "./cron";

const at = (iso: string) => new Date(iso);
const MIN = 60_000;

describe("msUntilNextRun", () => {
  it("waits for :30 later in the same hour", () => {
    expect(msUntilNextRun(at("2026-10-30T21:10:00Z"))).toBe(20 * MIN);
  });
  it("rolls to the next hour once :30 has passed", () => {
    expect(msUntilNextRun(at("2026-10-30T21:45:00Z"))).toBe(45 * MIN);
  });
  it("never fires twice at exactly :30", () => {
    expect(msUntilNextRun(at("2026-10-30T21:30:00Z"))).toBe(60 * MIN);
  });
  it("crosses midnight", () => {
    expect(msUntilNextRun(at("2026-10-30T23:59:30Z"))).toBe(30 * MIN + 30_000);
  });
});
