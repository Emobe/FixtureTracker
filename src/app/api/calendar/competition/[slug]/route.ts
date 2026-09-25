import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { competitions, fixtures } from "@/db/schema";
import { buildCalendar } from "@/lib/calendar";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.replace(/\.ics$/, "");

  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.slug, slug),
  });
  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  const rows = await db.query.fixtures.findMany({
    where: eq(fixtures.competitionId, competition.id),
    orderBy: asc(fixtures.scheduledStartTime),
    with: {
      competition: { columns: { name: true, slug: true } },
      homeTeam: { columns: { name: true } },
      awayTeam: { columns: { name: true } },
      venue: { columns: { name: true, city: true, country: true } },
    },
  });

  const calendar = buildCalendar({
    name: `${competition.name} Fixtures`,
    description: `Fixtures and results for ${competition.name}`,
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
