import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { fixtures, teams } from "@/db/schema";
import { db } from "@/db";
import {
  getOrCreateCompetition,
  getOrCreateSport,
  getOrCreateTeam,
  getOrCreateVenue,
  upsertFixture,
} from "@/scrapers/db-helpers";
import { resetDatabase } from "../reset-db";

beforeEach(resetDatabase);

describe("getOrCreateSport / getOrCreateCompetition / getOrCreateVenue", () => {
  it("creates a row on first call and returns the same row on a repeat call", async () => {
    const first = await getOrCreateSport("rugby-league", "Rugby League");
    const second = await getOrCreateSport("rugby-league", "Rugby League");
    expect(second.id).toBe(first.id);

    const sport = first;
    const compFirst = await getOrCreateCompetition({
      sportId: sport.id,
      slug: "super-league-2026",
      name: "Super League 2026",
      isLocked: true,
      authorityType: "SCRAPED",
    });
    const compSecond = await getOrCreateCompetition({
      sportId: sport.id,
      slug: "super-league-2026",
      name: "Super League 2026 (ignored on conflict)",
      isLocked: true,
      authorityType: "SCRAPED",
    });
    expect(compSecond.id).toBe(compFirst.id);
    expect(compSecond.name).toBe("Super League 2026"); // didn't overwrite on conflict

    const venueFirst = await getOrCreateVenue("Brick Community Stadium");
    const venueSecond = await getOrCreateVenue("Brick Community Stadium");
    expect(venueSecond.id).toBe(venueFirst.id);
  });
});

describe("getOrCreateTeam", () => {
  it("namespaces the team slug by sport, so the same name in two sports doesn't collide", async () => {
    const footballSport = await getOrCreateSport("gaa-football", "GAA Football");
    const hurlingSport = await getOrCreateSport("gaa-hurling", "GAA Hurling");

    const corkFootball = await getOrCreateTeam({
      sportId: footballSport.id,
      sportSlug: "gaa-football",
      name: "Cork",
    });
    const corkHurling = await getOrCreateTeam({
      sportId: hurlingSport.id,
      sportSlug: "gaa-hurling",
      name: "Cork",
    });

    expect(corkFootball.id).not.toBe(corkHurling.id);
    expect(corkFootball.slug).toBe("gaa-football-cork");
    expect(corkHurling.slug).toBe("gaa-hurling-cork");
  });

  it("returns the existing row on a repeat call instead of creating a duplicate", async () => {
    const sport = await getOrCreateSport("rugby-league", "Rugby League");
    await getOrCreateTeam({ sportId: sport.id, sportSlug: "rugby-league", name: "Wigan Warriors" });
    await getOrCreateTeam({ sportId: sport.id, sportSlug: "rugby-league", name: "Wigan Warriors" });

    const rows = await db.query.teams.findMany({ where: eq(teams.slug, "rugby-league-wigan-warriors") });
    expect(rows).toHaveLength(1);
  });

  it("sets crestUrl from the known TEAM_CRESTS mapping when creating a new team", async () => {
    const sport = await getOrCreateSport("rugby-league", "Rugby League");
    const team = await getOrCreateTeam({
      sportId: sport.id,
      sportSlug: "rugby-league",
      name: "Wigan Warriors",
    });
    expect(team.crestUrl).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
  });

  it("leaves crestUrl null for a team with no known crest mapping", async () => {
    const sport = await getOrCreateSport("roller-derby", "Roller Derby");
    const team = await getOrCreateTeam({
      sportId: sport.id,
      sportSlug: "roller-derby",
      name: "Some Grassroots Club Nobody Has Heard Of",
    });
    expect(team.crestUrl).toBeNull();
  });
});

describe("upsertFixture", () => {
  it("inserts on first call and updates the same row (never a duplicate) on a repeat call with the same externalRef", async () => {
    const sport = await getOrCreateSport("rugby-league", "Rugby League");
    const competition = await getOrCreateCompetition({
      sportId: sport.id,
      slug: "super-league-2026",
      name: "Super League 2026",
      isLocked: true,
      authorityType: "SCRAPED",
    });
    const home = await getOrCreateTeam({ sportId: sport.id, sportSlug: "rugby-league", name: "Wigan Warriors" });
    const away = await getOrCreateTeam({ sportId: sport.id, sportSlug: "rugby-league", name: "St Helens" });

    const first = await upsertFixture({
      competitionId: competition.id,
      homeTeamId: home.id,
      awayTeamId: away.id,
      externalRef: "sl-2026-round-1-wigan-st-helens",
      scheduledStartTime: new Date("2026-02-01T15:00:00Z"),
      status: "SCHEDULED",
      trustStatus: "OFFICIAL",
    });
    expect(first.action).toBe("inserted");

    // Simulate a rescheduled kickoff being re-scraped.
    const second = await upsertFixture({
      competitionId: competition.id,
      homeTeamId: home.id,
      awayTeamId: away.id,
      externalRef: "sl-2026-round-1-wigan-st-helens",
      scheduledStartTime: new Date("2026-02-02T18:00:00Z"),
      status: "SCHEDULED",
      trustStatus: "OFFICIAL",
    });
    expect(second.action).toBe("updated");
    expect(second.id).toBe(first.id);

    const rows = await db.query.fixtures.findMany({ where: eq(fixtures.competitionId, competition.id) });
    expect(rows).toHaveLength(1);
    expect(rows[0].scheduledStartTime.toISOString()).toBe("2026-02-02T18:00:00.000Z");
  });
});
