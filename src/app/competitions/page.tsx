import { ShieldCheck, Users } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { BrowseTabs } from "@/components/BrowseTabs";
import { SportFilterPills } from "@/components/SportFilterPills";
import { competitions, sports } from "@/db/schema";
import { db } from "@/db";

export const metadata = { title: "Competitions — Sports Fixtures" };

async function getCompetitions(sportSlug: string | undefined) {
  const where = sportSlug
    ? eq(competitions.sportId, (await db.query.sports.findFirst({ where: eq(sports.slug, sportSlug) }))?.id ?? "")
    : undefined;

  return db.query.competitions.findMany({
    where,
    orderBy: asc(competitions.name),
    columns: { slug: true, name: true, season: true, isLocked: true },
    with: { sport: { columns: { slug: true, name: true } } },
  });
}

export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const params = await searchParams;
  const rows = await getCompetitions(params.sport);

  const grouped = new Map<string, { sportName: string; competitions: typeof rows }>();
  for (const competition of rows) {
    const key = competition.sport.slug;
    if (!grouped.has(key)) grouped.set(key, { sportName: competition.sport.name, competitions: [] });
    grouped.get(key)!.competitions.push(competition);
  }

  return (
    <div className="flex flex-1 flex-col">
      <BrowseTabs />
      <Suspense fallback={<div className="h-[52px]" />}>
        <SportFilterPills />
      </Suspense>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-600">No competitions found.</p>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          {[...grouped.values()].map((group) => (
            <div key={group.sportName}>
              <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                {group.sportName}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                {group.competitions.map((competition, i) => (
                  <Link
                    key={competition.slug}
                    href={`/competitions/${competition.slug}`}
                    className={`tap-active flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                      i > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <span
                      title={competition.isLocked ? "Official, scraped from the league" : "Community managed"}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                    >
                      {competition.isLocked ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{competition.name}</span>
                      {competition.season && (
                        <span className="block text-xs text-zinc-400 dark:text-zinc-500">
                          {competition.season}
                        </span>
                      )}
                    </span>
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
