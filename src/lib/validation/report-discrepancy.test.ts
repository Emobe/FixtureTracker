import { describe, expect, it } from "vitest";
import { reportDiscrepancySchema } from "./report-discrepancy";

const VALID = {
  fixtureId: "11111111-1111-4111-8111-111111111111",
  reason: "The official league site now lists this as postponed.",
  proofUrl: "https://example.com/notice",
};

describe("reportDiscrepancySchema", () => {
  it("accepts a fully valid report", () => {
    expect(reportDiscrepancySchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a reason under 10 characters", () => {
    const result = reportDiscrepancySchema.safeParse({ ...VALID, reason: "too short" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID fixtureId", () => {
    const result = reportDiscrepancySchema.safeParse({ ...VALID, fixtureId: "nope" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid proof URL", () => {
    const result = reportDiscrepancySchema.safeParse({ ...VALID, proofUrl: "nope" });
    expect(result.success).toBe(false);
  });
});
