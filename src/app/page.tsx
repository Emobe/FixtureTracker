import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { Suspense } from "react";
import { DateBar } from "@/components/DateBar";
import { FixtureCard } from "@/components/FixtureCard";
import { SportFilterPills } from "@/components/SportFilterPills";
import { db } from "@/db";
import { competitions, fixtures, sports } from "@/db/schema";

function parseDateParam(value: string | undefined): Date {
  if (value) {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function getFixturesForDay(sportSlug: string | undefined, day: Date) {
  const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);

  const conditions = [
    gte(fixtures.scheduledStartTime, day),
    lt(fixtures.scheduledStartTime, nextDay),
  ];

  if (sportSlug) {
    const sport = await db.query.sports.findFirst({ where: eq(sports.slug, sportSlug) });
    if (!sport) return [];
    const sportCompetitions = await db
      .select({ id: competitions.id })
      .from(competitions)
      .where(eq(competitions.sportId, sport.id));
    conditions.push(inArray(fixtures.competitionId, sportCompetitions.map((c) => c.id)));
  }

  return db.query.fixtures.findMany({
    where: and(...conditions),
    orderBy: asc(fixtures.scheduledStartTime),
    with: {
      competition: { columns: { slug: true, name: true } },
      homeTeam: { columns: { slug: true, name: true, shortName: true, crestUrl: true } },
      awayTeam: { columns: { slug: true, name: true, shortName: true, crestUrl: true } },
      venue: { columns: { name: true, city: true, country: true } },
    },
  });
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; date?: string }>;
}) {
  const params = await searchParams;
  const day = parseDateParam(params.date);
  const fixtureRows = await getFixturesForDay(params.sport, day);

  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<div className="h-[52px]" />}>
        <SportFilterPills />
      </Suspense>
      <Suspense fallback={<div className="h-[52px]" />}>
        <DateBar />
      </Suspense>

      {fixtureRows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center text-neutral-400 dark:text-neutral-600">
          <p className="text-sm">No fixtures for this day.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {fixtureRows.map((fixture) => (
            <FixtureCard key={fixture.id} fixture={fixture} />
          ))}
        </div>
      )}
    </div>
  );
}
