import { describe, expect, it } from "vitest";
import { fixtureSubmissionSchema } from "./fixture-submission";

const VALID = {
  competitionId: "11111111-1111-4111-8111-111111111111",
  homeTeamName: "Belfast City Rollers",
  awayTeamName: "Cork Quad Squad",
  date: "2026-11-14",
  time: "19:00",
  venueName: "Community Sports Hall",
  proofUrl: "https://example.com/announcement",
};

describe("fixtureSubmissionSchema", () => {
  it("accepts a fully valid submission", () => {
    const result = fixtureSubmissionSchema.safeParse(VALID);
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID competitionId", () => {
    const result = fixtureSubmissionSchema.safeParse({ ...VALID, competitionId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a UUID that isn't actually well-formed (e.g. missing version/variant nibble)", () => {
    const result = fixtureSubmissionSchema.safeParse({
      ...VALID,
      competitionId: "11111111-1111-1111-1111-111111111111",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a home team name that's too short", () => {
    const result = fixtureSubmissionSchema.safeParse({ ...VALID, homeTeamName: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid proof URL", () => {
    const result = fixtureSubmissionSchema.safeParse({ ...VALID, proofUrl: "not a url" });
    expect(result.success).toBe(false);
  });

  it("rejects when home and away team names are the same (case-insensitively)", () => {
    const result = fixtureSubmissionSchema.safeParse({
      ...VALID,
      homeTeamName: "Belfast City Rollers",
      awayTeamName: "belfast city rollers",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["awayTeamName"]);
    }
  });

  it("trims whitespace from text fields", () => {
    const result = fixtureSubmissionSchema.safeParse({
      ...VALID,
      homeTeamName: "  Belfast City Rollers  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.homeTeamName).toBe("Belfast City Rollers");
  });

  it("rejects a missing required field", () => {
    const withoutDate: Partial<typeof VALID> = { ...VALID };
    delete withoutDate.date;
    const result = fixtureSubmissionSchema.safeParse(withoutDate);
    expect(result.success).toBe(false);
  });
});
