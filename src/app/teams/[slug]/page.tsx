import { asc, eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FixtureCard } from "@/components/FixtureCard";
import { SubscribeCalendarModal } from "@/components/SubscribeCalendarModal";
import { db } from "@/db";
import { fixtures, teams } from "@/db/schema";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const team = await db.query.teams.findFirst({ where: eq(teams.slug, slug) });
  if (!team) notFound();

  const rows = await db.query.fixtures.findMany({
    where: or(eq(fixtures.homeTeamId, team.id), eq(fixtures.awayTeamId, team.id)),
    orderBy: asc(fixtures.scheduledStartTime),
    with: {
      competition: { columns: { slug: true, name: true } },
      homeTeam: { columns: { slug: true, name: true, shortName: true, crestUrl: true } },
      awayTeam: { columns: { slug: true, name: true, shortName: true, crestUrl: true } },
      venue: { columns: { name: true, city: true, country: true } },
    },
  });

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="truncate text-xl font-semibold">{team.name}</h1>
        <SubscribeCalendarModal kind="team" slug={team.slug} name={team.name} />
      </div>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-400 dark:text-neutral-600">
          No fixtures yet.
        </p>
      ) : (
        rows.map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} />)
      )}
    </div>
  );
}
