import { and, asc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { competitions, fixtures, sports, teams } from "@/db/schema";
import { paginationMeta, parsePagination } from "@/lib/pagination";
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitHeaders,
} from "@/lib/rate-limit";

const VALID_STATUSES = [
  "SCHEDULED",
  "POSTPONED",
  "CANCELLED",
  "COMPLETED",
] as const;

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(clientKeyFromRequest(request));
  const headers = rateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers },
    );
  }

  const { searchParams } = new URL(request.url);
  const sportSlug = searchParams.get("sport");
  const competitionSlug = searchParams.get("competition");
  const teamSlug = searchParams.get("team");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const status = searchParams.get("status");
  const pagination = parsePagination(searchParams);

  if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400, headers },
    );
  }
  if (dateFrom && Number.isNaN(Date.parse(dateFrom))) {
    return NextResponse.json(
      { error: "Invalid dateFrom; expected an ISO 8601 date" },
      { status: 400, headers },
    );
  }
  if (dateTo && Number.isNaN(Date.parse(dateTo))) {
    return NextResponse.json(
      { error: "Invalid dateTo; expected an ISO 8601 date" },
      { status: 400, headers },
    );
  }

  const conditions = [];

  if (competitionSlug) {
    const competition = await db.query.competitions.findFirst({
      where: eq(competitions.slug, competitionSlug),
    });
    if (!competition) {
      return NextResponse.json(
        { data: [], pagination: paginationMeta(pagination, 0) },
        { headers },
      );
    }
    conditions.push(eq(fixtures.competitionId, competition.id));
  } else if (sportSlug) {
    const sport = await db.query.sports.findFirst({
      where: eq(sports.slug, sportSlug),
    });
    if (!sport) {
      return NextResponse.json(
        { data: [], pagination: paginationMeta(pagination, 0) },
        { headers },
      );
    }
    const sportCompetitions = await db
      .select({ id: competitions.id })
      .from(competitions)
      .where(eq(competitions.sportId, sport.id));
    conditions.push(
      inArray(
        fixtures.competitionId,
        sportCompetitions.map((c) => c.id),
      ),
    );
  }

  if (teamSlug) {
    const team = await db.query.teams.findFirst({
      where: eq(teams.slug, teamSlug),
    });
    if (!team) {
      return NextResponse.json(
        { data: [], pagination: paginationMeta(pagination, 0) },
        { headers },
      );
    }
    conditions.push(
      or(eq(fixtures.homeTeamId, team.id), eq(fixtures.awayTeamId, team.id)),
    );
  }

  if (dateFrom) conditions.push(gte(fixtures.scheduledStartTime, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(fixtures.scheduledStartTime, new Date(dateTo)));
  if (status) conditions.push(eq(fixtures.status, status as (typeof VALID_STATUSES)[number]));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.query.fixtures.findMany({
      where,
      orderBy: asc(fixtures.scheduledStartTime),
      limit: pagination.pageSize,
      offset: pagination.offset,
      with: {
        competition: { columns: { id: true, slug: true, name: true, season: true } },
        homeTeam: { columns: { id: true, slug: true, name: true, shortName: true, crestUrl: true } },
        awayTeam: { columns: { id: true, slug: true, name: true, shortName: true, crestUrl: true } },
        venue: { columns: { id: true, name: true, city: true, country: true } },
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(fixtures)
      .where(where),
  ]);

  const data = rows.map((f) => ({
    id: f.id,
    scheduledStartTime: f.scheduledStartTime,
    status: f.status,
    trustStatus: f.trustStatus,
    broadcastInfo: f.broadcastInfo,
    streamUrl: f.streamUrl,
    homeScoreDisplay: f.homeScoreDisplay,
    awayScoreDisplay: f.awayScoreDisplay,
    scoreData: f.scoreData,
    competition: f.competition,
    homeTeam: f.homeTeam,
    awayTeam: f.awayTeam,
    venue: f.venue,
  }));

  return NextResponse.json(
    { data, pagination: paginationMeta(pagination, count) },
    { headers },
  );
}
