import { and, asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sports, teams } from "@/db/schema";
import { paginationMeta, parsePagination } from "@/lib/pagination";
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitHeaders,
} from "@/lib/rate-limit";

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
  const pagination = parsePagination(searchParams);

  const conditions = [];
  if (sportSlug) {
    const sport = await db.query.sports.findFirst({
      where: eq(sports.slug, sportSlug),
    });
    if (!sport) {
      return NextResponse.json(
        { data: [], pagination: paginationMeta(pagination, 0) },
        { headers },
      );
    }
    conditions.push(eq(teams.sportId, sport.id));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.query.teams.findMany({
      where,
      orderBy: asc(teams.name),
      limit: pagination.pageSize,
      offset: pagination.offset,
      with: {
        sport: { columns: { id: true, slug: true, name: true } },
        homeVenue: { columns: { id: true, name: true, city: true, country: true } },
      },
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(teams).where(where),
  ]);

  return NextResponse.json(
    { data: rows, pagination: paginationMeta(pagination, count) },
    { headers },
  );
}
