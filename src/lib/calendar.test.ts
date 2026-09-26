import { describe, expect, it } from "vitest";
import { buildCalendar } from "./calendar";

/** ICS folds long lines at ~75 chars with a "\r\n " continuation; undo that before substring assertions. */
function unfold(ics: string): string {
  return ics.replace(/\r\n /g, "");
}

function makeFixture(overrides: Partial<Parameters<typeof buildCalendar>[0]["fixtures"][number]> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    competitionId: "comp-1",
    homeTeamId: "home-1",
    awayTeamId: "away-1",
    venueId: "venue-1",
    externalRef: null,
    submittedByUserId: null,
    scheduledStartTime: new Date("2026-09-12T14:00:00.000Z"),
    status: "SCHEDULED" as const,
    broadcastInfo: null,
    streamUrl: null,
    homeScoreDisplay: null,
    awayScoreDisplay: null,
    scoreData: null,
    trustStatus: "OFFICIAL" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    competition: { name: "Super League 2026", slug: "super-league-2026" },
    homeTeam: { name: "Wigan Warriors" },
    awayTeam: { name: "St Helens" },
    venue: { name: "Brick Community Stadium", city: "Wigan", country: "England" },
    ...overrides,
  };
}

describe("buildCalendar", () => {
  it("produces a valid VCALENDAR with one VEVENT per fixture", () => {
    const calendar = buildCalendar({
      name: "Wigan Warriors",
      fixtures: [makeFixture()],
    });
    const ics = unfold(calendar.toString());

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Wigan Warriors vs St Helens");
    expect(ics).toContain("LOCATION:Brick Community Stadium\\, Wigan\\, England");
  });

  it("marks a completed fixture CONFIRMED and includes the final score in the description", () => {
    const calendar = buildCalendar({
      name: "Test",
      fixtures: [
        makeFixture({
          status: "COMPLETED",
          homeScoreDisplay: "48",
          awayScoreDisplay: "16",
        }),
      ],
    });
    const ics = unfold(calendar.toString());

    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("Final score: Wigan Warriors 48 - 16 St Helens");
  });

  it("marks a postponed fixture TENTATIVE", () => {
    const calendar = buildCalendar({
      name: "Test",
      fixtures: [makeFixture({ status: "POSTPONED" })],
    });
    expect(calendar.toString()).toContain("STATUS:TENTATIVE");
  });

  it("marks a cancelled fixture CANCELLED", () => {
    const calendar = buildCalendar({
      name: "Test",
      fixtures: [makeFixture({ status: "CANCELLED" })],
    });
    expect(calendar.toString()).toContain("STATUS:CANCELLED");
  });

  it("omits location when there's no venue", () => {
    const calendar = buildCalendar({
      name: "Test",
      fixtures: [makeFixture({ venue: null })],
    });
    expect(calendar.toString()).not.toContain("LOCATION:");
  });

  it("includes the trust status and broadcast info in the description", () => {
    const calendar = buildCalendar({
      name: "Test",
      fixtures: [
        makeFixture({
          trustStatus: "NEEDS_VERIFICATION",
          broadcastInfo: "Sky Sports",
        }),
      ],
    });
    const ics = unfold(calendar.toString());
    expect(ics).toContain("Needs verification");
    expect(ics).toContain("Broadcast: Sky Sports");
  });
});
