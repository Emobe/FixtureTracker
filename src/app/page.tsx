import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import Link from "next/link";
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

function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Competition ids for a sport slug, or undefined if no sport filter was requested. */
async function resolveCompetitionIds(sportSlug: string | undefined) {
  if (!sportSlug) return undefined;
  const sport = await db.query.sports.findFirst({ where: eq(sports.slug, sportSlug) });
  if (!sport) return [];
  const rows = await db
    .select({ id: competitions.id })
    .from(competitions)
    .where(eq(competitions.sportId, sport.id));
  return rows.map((c) => c.id);
}

async function getFixturesForDay(competitionIds: string[] | undefined, day: Date) {
  const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
  const conditions = [
    gte(fixtures.scheduledStartTime, day),
    lt(fixtures.scheduledStartTime, nextDay),
  ];
  if (competitionIds) conditions.push(inArray(fixtures.competitionId, competitionIds));

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

/** The nearest date (any sport-filtered fixture) to `day`, preferring the future. */
async function findNearestFixtureDate(
  competitionIds: string[] | undefined,
  day: Date,
): Promise<Date | null> {
  const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
  const sportCondition = competitionIds ? inArray(fixtures.competitionId, competitionIds) : undefined;

  const [future] = await db
    .select({ t: fixtures.scheduledStartTime })
    .from(fixtures)
    .where(sportCondition ? and(gte(fixtures.scheduledStartTime, nextDay), sportCondition) : gte(fixtures.scheduledStartTime, nextDay))
    .orderBy(asc(fixtures.scheduledStartTime))
    .limit(1);
  if (future) return future.t;

  const [past] = await db
    .select({ t: fixtures.scheduledStartTime })
    .from(fixtures)
    .where(sportCondition ? and(lt(fixtures.scheduledStartTime, day), sportCondition) : lt(fixtures.scheduledStartTime, day))
    .orderBy(desc(fixtures.scheduledStartTime))
    .limit(1);
  return past?.t ?? null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; date?: string }>;
}) {
  const params = await searchParams;
  const day = parseDateParam(params.date);
  const competitionIds = await resolveCompetitionIds(params.sport);
  const fixtureRows = await getFixturesForDay(competitionIds, day);

  const nearestDate =
    fixtureRows.length === 0 ? await findNearestFixtureDate(competitionIds, day) : null;
  const nearestDateParam = nearestDate ? toDateParam(nearestDate) : null;
  const nearestHref = nearestDateParam
    ? `/?date=${nearestDateParam}${params.sport ? `&sport=${params.sport}` : ""}`
    : null;

  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<div className="h-[52px]" />}>
        <SportFilterPills />
      </Suspense>
      <Suspense fallback={<div className="h-[52px]" />}>
        <DateBar />
      </Suspense>

      {fixtureRows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-20 text-center">
          <p className="text-sm text-zinc-400 dark:text-zinc-600">No fixtures for this day.</p>
          {nearestHref && nearestDate && (
            <Link href={nearestHref} className="text-sm font-medium text-accent hover:underline">
              See fixtures on{" "}
              {nearestDate.toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Link>
          )}
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
