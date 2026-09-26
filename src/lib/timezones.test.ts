import { describe, expect, it } from "vitest";
import { zonedWallTimeToUtc } from "./timezones";

describe("zonedWallTimeToUtc", () => {
  it("converts a winter (GMT) wall-clock time in Europe/London with no offset", () => {
    // 15 Jan 2026, 15:00 London time = GMT (UTC+0) in winter.
    const result = zonedWallTimeToUtc(
      { year: 2026, month: 1, day: 15, hour: 15, minute: 0 },
      "Europe/London",
    );
    expect(result.toISOString()).toBe("2026-01-15T15:00:00.000Z");
  });

  it("converts a summer (BST) wall-clock time in Europe/London, applying the +1h offset", () => {
    // 12 Sep 2026, 15:00 London time = BST (UTC+1) in summer, so 14:00 UTC.
    const result = zonedWallTimeToUtc(
      { year: 2026, month: 9, day: 12, hour: 15, minute: 0 },
      "Europe/London",
    );
    expect(result.toISOString()).toBe("2026-09-12T14:00:00.000Z");
  });

  it("applies Europe/Dublin's offset the same way as Europe/London (both follow EU DST)", () => {
    const result = zonedWallTimeToUtc(
      { year: 2026, month: 7, day: 26, hour: 19, minute: 0 },
      "Europe/Dublin",
    );
    expect(result.toISOString()).toBe("2026-07-26T18:00:00.000Z");
  });

  it("handles a fixed-offset zone with no DST (Europe/Paris in winter, UTC+1)", () => {
    const result = zonedWallTimeToUtc(
      { year: 2026, month: 1, day: 1, hour: 20, minute: 45 },
      "Europe/Paris",
    );
    expect(result.toISOString()).toBe("2026-01-01T19:45:00.000Z");
  });
});
