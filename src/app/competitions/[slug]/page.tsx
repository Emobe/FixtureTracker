import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { FixtureCard } from "@/components/FixtureCard";
import { SubscribeCalendarModal } from "@/components/SubscribeCalendarModal";
import { competitions, fixtures } from "@/db/schema";
import { db } from "@/db";
import { getVoteInfoForFixtures } from "@/lib/votes";

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.slug, slug),
  });
  if (!competition) notFound();

  const rows = await db.query.fixtures.findMany({
    where: eq(fixtures.competitionId, competition.id),
    orderBy: asc(fixtures.scheduledStartTime),
    with: {
      competition: { columns: { slug: true, name: true } },
      homeTeam: { columns: { slug: true, name: true, shortName: true, crestUrl: true } },
      awayTeam: { columns: { slug: true, name: true, shortName: true, crestUrl: true } },
      venue: { columns: { name: true, city: true, country: true } },
    },
  });

  const session = await auth();
  const voteInfo = await getVoteInfoForFixtures(
    rows.map((f) => f.id),
    session?.user?.id,
  );

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3 pb-1">
        <h1 className="truncate text-xl font-bold tracking-tight">{competition.name}</h1>
        <SubscribeCalendarModal kind="competition" slug={competition.slug} name={competition.name} />
      </div>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-600">
          No fixtures yet.
        </p>
      ) : (
        rows.map((fixture) => (
          <FixtureCard
            key={fixture.id}
            fixture={fixture}
            netVotes={voteInfo[fixture.id]?.netVotes}
            userVote={voteInfo[fixture.id]?.userVote}
            canInteract={!!session?.user}
          />
        ))
      )}
    </div>
  );
}
