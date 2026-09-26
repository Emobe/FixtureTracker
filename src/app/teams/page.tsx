import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { BrowseTabs } from "@/components/BrowseTabs";
import { SportFilterPills } from "@/components/SportFilterPills";
import { db } from "@/db";
import { sports, teams } from "@/db/schema";

export const metadata = { title: "Teams — Sports Fixtures" };

async function getTeams(sportSlug: string | undefined) {
  const where = sportSlug
    ? eq(teams.sportId, (await db.query.sports.findFirst({ where: eq(sports.slug, sportSlug) }))?.id ?? "")
    : undefined;

  return db.query.teams.findMany({
    where,
    orderBy: asc(teams.name),
    columns: { slug: true, name: true, shortName: true, crestUrl: true },
    with: { sport: { columns: { slug: true, name: true } } },
  });
}

function TeamCrest({ team }: { team: { name: string; shortName: string | null; crestUrl: string | null } }) {
  if (team.crestUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain crest URLs.
    return <img src={team.crestUrl} alt="" className="h-9 w-9 shrink-0 object-contain" />;
  }
  const initials = (team.shortName ?? team.name).slice(0, 2).toUpperCase();
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
      {initials}
    </span>
  );
}

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const params = await searchParams;
  const rows = await getTeams(params.sport);

  const grouped = new Map<string, { sportName: string; teams: typeof rows }>();
  for (const team of rows) {
    const key = team.sport.slug;
    if (!grouped.has(key)) grouped.set(key, { sportName: team.sport.name, teams: [] });
    grouped.get(key)!.teams.push(team);
  }

  return (
    <div className="flex flex-1 flex-col">
      <BrowseTabs />
      <Suspense fallback={<div className="h-[52px]" />}>
        <SportFilterPills />
      </Suspense>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-600">No teams found.</p>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          {[...grouped.values()].map((group) => (
            <div key={group.sportName}>
              <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                {group.sportName}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                {group.teams.map((team, i) => (
                  <Link
                    key={team.slug}
                    href={`/teams/${team.slug}`}
                    className={`tap-active flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                      i > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <TeamCrest team={team} />
                    <span className="truncate text-sm font-medium">{team.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
