import { asc, ilike } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { competitions, teams } from "@/db/schema";
import { checkRateLimit, clientKeyFromRequest, rateLimitHeaders } from "@/lib/rate-limit";

const RESULT_LIMIT = 8;

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(clientKeyFromRequest(request));
  const headers = rateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ teams: [], competitions: [] }, { headers });
  }

  const pattern = `%${q}%`;

  const [teamRows, competitionRows] = await Promise.all([
    db.query.teams.findMany({
      where: ilike(teams.name, pattern),
      orderBy: asc(teams.name),
      limit: RESULT_LIMIT,
      columns: { slug: true, name: true, shortName: true, crestUrl: true },
      with: { sport: { columns: { name: true } } },
    }),
    db.query.competitions.findMany({
      where: ilike(competitions.name, pattern),
      orderBy: asc(competitions.name),
      limit: RESULT_LIMIT,
      columns: { slug: true, name: true },
      with: { sport: { columns: { name: true } } },
    }),
  ]);

  return NextResponse.json({ teams: teamRows, competitions: competitionRows }, { headers });
}
