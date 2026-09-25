import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { competitions, fixtures, sports, teams, venues } from "../db/schema";
import { TEAM_CRESTS } from "./team-crests";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getOrCreateSport(slug: string, name: string) {
  const existing = await db.query.sports.findFirst({
    where: eq(sports.slug, slug),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(sports)
    .values({ slug, name })
    .onConflictDoNothing({ target: sports.slug })
    .returning();
  if (created) return created;

  // Lost a race with another writer; the row now exists.
  const row = await db.query.sports.findFirst({
    where: eq(sports.slug, slug),
  });
  if (!row) throw new Error(`Failed to get or create sport "${slug}"`);
  return row;
}

export async function getOrCreateCompetition(params: {
  sportId: string;
  slug: string;
  name: string;
  season?: string | null;
  isLocked: boolean;
  authorityType: "SCRAPED" | "COMMUNITY";
  websiteUrl?: string | null;
}) {
  const existing = await db.query.competitions.findFirst({
    where: eq(competitions.slug, params.slug),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(competitions)
    .values(params)
    .onConflictDoNothing({ target: competitions.slug })
    .returning();
  if (created) return created;

  const row = await db.query.competitions.findFirst({
    where: eq(competitions.slug, params.slug),
  });
  if (!row)
    throw new Error(`Failed to get or create competition "${params.slug}"`);
  return row;
}

export async function getOrCreateVenue(
  name: string,
  extra: Partial<typeof venues.$inferInsert> = {},
) {
  const existing = await db.query.venues.findFirst({
    where: eq(venues.name, name),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(venues)
    .values({ name, ...extra })
    .onConflictDoNothing({ target: venues.name })
    .returning();
  if (created) return created;

  const row = await db.query.venues.findFirst({
    where: eq(venues.name, name),
  });
  if (!row) throw new Error(`Failed to get or create venue "${name}"`);
  return row;
}

export async function getOrCreateTeam(params: {
  sportId: string;
  /** Sport slug (e.g. "gaa-football"), namespacing the team slug so the
   *  same name under different sports (e.g. a county's football vs.
   *  hurling team) doesn't collide on the globally-unique `teams.slug`. */
  sportSlug: string;
  name: string;
  shortName?: string | null;
}) {
  const slug = `${params.sportSlug}-${slugify(params.name)}`;
  const existing = await db.query.teams.findFirst({
    where: eq(teams.slug, slug),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(teams)
    .values({
      sportId: params.sportId,
      slug,
      name: params.name,
      shortName: params.shortName ?? null,
      crestUrl: TEAM_CRESTS[slug] ?? null,
    })
    .onConflictDoNothing({ target: teams.slug })
    .returning();
  if (created) return created;

  const row = await db.query.teams.findFirst({ where: eq(teams.slug, slug) });
  if (!row) throw new Error(`Failed to get or create team "${params.name}"`);
  return row;
}

export interface UpsertFixtureParams {
  competitionId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId?: string | null;
  externalRef: string;
  scheduledStartTime: Date;
  status: "SCHEDULED" | "POSTPONED" | "CANCELLED" | "COMPLETED";
  broadcastInfo?: string | null;
  streamUrl?: string | null;
  homeScoreDisplay?: string | null;
  awayScoreDisplay?: string | null;
  scoreData?: Record<string, unknown> | null;
  trustStatus: "OFFICIAL" | "COMMUNITY_VERIFIED" | "NEEDS_VERIFICATION";
}

/**
 * Idempotently insert or update a fixture, matched by
 * `(competitionId, externalRef)` so reschedules update the existing row
 * instead of creating a duplicate.
 */
export async function upsertFixture(
  params: UpsertFixtureParams,
): Promise<{ action: "inserted" | "updated"; id: string }> {
  const existing = await db.query.fixtures.findFirst({
    where: and(
      eq(fixtures.competitionId, params.competitionId),
      eq(fixtures.externalRef, params.externalRef),
    ),
  });

  if (existing) {
    await db
      .update(fixtures)
      .set({
        homeTeamId: params.homeTeamId,
        awayTeamId: params.awayTeamId,
        venueId: params.venueId ?? null,
        scheduledStartTime: params.scheduledStartTime,
        status: params.status,
        broadcastInfo: params.broadcastInfo ?? null,
        streamUrl: params.streamUrl ?? null,
        homeScoreDisplay: params.homeScoreDisplay ?? null,
        awayScoreDisplay: params.awayScoreDisplay ?? null,
        scoreData: params.scoreData ?? null,
        trustStatus: params.trustStatus,
        updatedAt: new Date(),
      })
      .where(eq(fixtures.id, existing.id));
    return { action: "updated", id: existing.id };
  }

  const [created] = await db
    .insert(fixtures)
    .values({
      competitionId: params.competitionId,
      homeTeamId: params.homeTeamId,
      awayTeamId: params.awayTeamId,
      venueId: params.venueId ?? null,
      externalRef: params.externalRef,
      scheduledStartTime: params.scheduledStartTime,
      status: params.status,
      broadcastInfo: params.broadcastInfo ?? null,
      streamUrl: params.streamUrl ?? null,
      homeScoreDisplay: params.homeScoreDisplay ?? null,
      awayScoreDisplay: params.awayScoreDisplay ?? null,
      scoreData: params.scoreData ?? null,
      trustStatus: params.trustStatus,
    })
    .returning();
  return { action: "inserted", id: created.id };
}
