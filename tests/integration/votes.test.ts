import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { competitions, fixtures, sports, teams, users, votes } from "@/db/schema";
import { castVoteForUser } from "@/lib/votes";
import { resetDatabase } from "../reset-db";

beforeEach(resetDatabase);

async function seedFixture(isLocked: boolean) {
  const [sport] = await db.insert(sports).values({ slug: "roller-derby", name: "Roller Derby" }).returning();
  const [competition] = await db
    .insert(competitions)
    .values({
      sportId: sport.id,
      slug: "community-league-2026",
      name: "Community League 2026",
      isLocked,
      authorityType: isLocked ? "SCRAPED" : "COMMUNITY",
    })
    .returning();
  const [home] = await db
    .insert(teams)
    .values({ sportId: sport.id, slug: "roller-derby-home", name: "Home Rollers" })
    .returning();
  const [away] = await db
    .insert(teams)
    .values({ sportId: sport.id, slug: "roller-derby-away", name: "Away Rollers" })
    .returning();
  const [fixture] = await db
    .insert(fixtures)
    .values({
      competitionId: competition.id,
      homeTeamId: home.id,
      awayTeamId: away.id,
      scheduledStartTime: new Date("2026-11-14T19:00:00Z"),
      status: "SCHEDULED",
      trustStatus: isLocked ? "OFFICIAL" : "NEEDS_VERIFICATION",
    })
    .returning();
  return fixture;
}

async function seedUser(email: string) {
  const [user] = await db.insert(users).values({ email }).returning();
  return user;
}

describe("castVoteForUser", () => {
  it("rejects voting on a fixture that belongs to a locked competition", async () => {
    const fixture = await seedFixture(true);
    const user = await seedUser("voter@example.com");

    const result = await castVoteForUser(fixture.id, user.id, 1);
    expect(result.status).toBe("error");

    const rows = await db.query.votes.findMany();
    expect(rows).toHaveLength(0);
  });

  it("inserts a vote and leaves trustStatus alone below the +3 threshold", async () => {
    const fixture = await seedFixture(false);
    const user = await seedUser("voter@example.com");

    const result = await castVoteForUser(fixture.id, user.id, 1);
    expect(result.status).toBe("ok");

    const updated = await db.query.fixtures.findFirst({ where: eq(fixtures.id, fixture.id) });
    expect(updated?.trustStatus).toBe("NEEDS_VERIFICATION");
  });

  it("promotes trustStatus to COMMUNITY_VERIFIED exactly when net votes reach +3", async () => {
    const fixture = await seedFixture(false);
    const voters = await Promise.all(
      ["v1@example.com", "v2@example.com", "v3@example.com"].map(seedUser),
    );

    await castVoteForUser(fixture.id, voters[0].id, 1);
    let current = await db.query.fixtures.findFirst({ where: eq(fixtures.id, fixture.id) });
    expect(current?.trustStatus).toBe("NEEDS_VERIFICATION");

    await castVoteForUser(fixture.id, voters[1].id, 1);
    current = await db.query.fixtures.findFirst({ where: eq(fixtures.id, fixture.id) });
    expect(current?.trustStatus).toBe("NEEDS_VERIFICATION");

    await castVoteForUser(fixture.id, voters[2].id, 1);
    current = await db.query.fixtures.findFirst({ where: eq(fixtures.id, fixture.id) });
    expect(current?.trustStatus).toBe("COMMUNITY_VERIFIED");
  });

  it("removes the vote when the same user casts the same direction again (toggle off)", async () => {
    const fixture = await seedFixture(false);
    const user = await seedUser("voter@example.com");

    await castVoteForUser(fixture.id, user.id, 1);
    await castVoteForUser(fixture.id, user.id, 1);

    const rows = await db.query.votes.findMany({
      where: and(eq(votes.userId, user.id), eq(votes.targetId, fixture.id)),
    });
    expect(rows).toHaveLength(0);
  });

  it("flips the vote when the same user casts the opposite direction", async () => {
    const fixture = await seedFixture(false);
    const user = await seedUser("voter@example.com");

    await castVoteForUser(fixture.id, user.id, 1);
    await castVoteForUser(fixture.id, user.id, -1);

    const rows = await db.query.votes.findMany({
      where: and(eq(votes.userId, user.id), eq(votes.targetId, fixture.id)),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].direction).toBe(-1);
  });

  it("does not demote an already COMMUNITY_VERIFIED fixture if votes later drop below +3", async () => {
    const fixture = await seedFixture(false);
    const voters = await Promise.all(
      ["v1@example.com", "v2@example.com", "v3@example.com"].map(seedUser),
    );
    for (const voter of voters) await castVoteForUser(fixture.id, voter.id, 1);

    let current = await db.query.fixtures.findFirst({ where: eq(fixtures.id, fixture.id) });
    expect(current?.trustStatus).toBe("COMMUNITY_VERIFIED");

    // One voter changes their mind — net votes drops to +1.
    await castVoteForUser(fixture.id, voters[0].id, -1);

    current = await db.query.fixtures.findFirst({ where: eq(fixtures.id, fixture.id) });
    expect(current?.trustStatus).toBe("COMMUNITY_VERIFIED");
  });
});
