import { asc, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { fixtures, teams } from "@/db/schema";
import { buildCalendar } from "@/lib/calendar";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.replace(/\.ics$/, "");

  const team = await db.query.teams.findFirst({ where: eq(teams.slug, slug) });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const rows = await db.query.fixtures.findMany({
    where: or(eq(fixtures.homeTeamId, team.id), eq(fixtures.awayTeamId, team.id)),
    orderBy: asc(fixtures.scheduledStartTime),
    with: {
      competition: { columns: { name: true, slug: true } },
      homeTeam: { columns: { name: true } },
      awayTeam: { columns: { name: true } },
      venue: { columns: { name: true, city: true, country: true } },
    },
  });

  const calendar = buildCalendar({
    name: `${team.name} Fixtures`,
    description: `Fixtures and results for ${team.name}`,
    fixtures: rows,
  });

  return new NextResponse(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
