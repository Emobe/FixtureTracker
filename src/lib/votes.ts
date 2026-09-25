import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { competitions, fixtures, votes } from "@/db/schema";

export interface VoteInfo {
  netVotes: number;
  userVote: 1 | -1 | null;
}

export interface VoteActionResult {
  status: "ok" | "error";
  message?: string;
}

const PROMOTION_THRESHOLD = 3;

/**
 * Core vote-casting + auto-promotion logic, independent of session lookup so
 * it can be exercised directly (e.g. in tests simulating several distinct
 * users) without needing that many real signed-in sessions. The Server
 * Action in src/app/actions/vote.ts is a thin wrapper that resolves the
 * userId from auth() and calls this.
 */
export async function castVoteForUser(
  fixtureId: string,
  userId: string,
  direction: 1 | -1,
): Promise<VoteActionResult> {
  const fixture = await db.query.fixtures.findFirst({ where: eq(fixtures.id, fixtureId) });
  if (!fixture) return { status: "error", message: "Fixture not found." };

  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.id, fixture.competitionId),
  });
  // Defense in depth: the UI only ever shows vote buttons on community
  // fixtures, but a tampered request could still target a locked one.
  if (competition?.isLocked) {
    return {
      status: "error",
      message: "Official fixtures can't be voted on — use Report Discrepancy instead.",
    };
  }

  const existing = await db.query.votes.findFirst({
    where: and(eq(votes.userId, userId), eq(votes.targetType, "FIXTURE"), eq(votes.targetId, fixtureId)),
  });

  if (existing && existing.direction === direction) {
    // Clicking the same direction again removes the vote.
    await db.delete(votes).where(eq(votes.id, existing.id));
  } else if (existing) {
    await db.update(votes).set({ direction }).where(eq(votes.id, existing.id));
  } else {
    await db.insert(votes).values({ targetType: "FIXTURE", targetId: fixtureId, userId, direction });
  }

  const [{ net }] = await db
    .select({ net: sql<number>`coalesce(sum(${votes.direction}), 0)::int` })
    .from(votes)
    .where(and(eq(votes.targetType, "FIXTURE"), eq(votes.targetId, fixtureId)));

  if (net >= PROMOTION_THRESHOLD && fixture.trustStatus === "NEEDS_VERIFICATION") {
    await db
      .update(fixtures)
      .set({ trustStatus: "COMMUNITY_VERIFIED", updatedAt: new Date() })
      .where(eq(fixtures.id, fixtureId));
  }

  return { status: "ok" };
}

/** Net votes and the current user's own vote (if any) for a batch of fixtures, keyed by fixture id. */
export async function getVoteInfoForFixtures(
  fixtureIds: string[],
  userId: string | undefined,
): Promise<Record<string, VoteInfo>> {
  const result: Record<string, VoteInfo> = {};
  for (const id of fixtureIds) result[id] = { netVotes: 0, userVote: null };
  if (fixtureIds.length === 0) return result;

  const netRows = await db
    .select({ targetId: votes.targetId, net: sql<number>`coalesce(sum(${votes.direction}), 0)::int` })
    .from(votes)
    .where(and(eq(votes.targetType, "FIXTURE"), inArray(votes.targetId, fixtureIds)))
    .groupBy(votes.targetId);
  for (const row of netRows) {
    if (result[row.targetId]) result[row.targetId].netVotes = row.net;
  }

  if (userId) {
    const userRows = await db
      .select({ targetId: votes.targetId, direction: votes.direction })
      .from(votes)
      .where(
        and(
          eq(votes.targetType, "FIXTURE"),
          eq(votes.userId, userId),
          inArray(votes.targetId, fixtureIds),
        ),
      );
    for (const row of userRows) {
      if (result[row.targetId]) result[row.targetId].userVote = row.direction as 1 | -1;
    }
  }

  return result;
}
