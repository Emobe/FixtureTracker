/**
 * GAA All-Ireland Senior Football & Hurling Championship scraper.
 *
 * gaa.ie/fixtures-results is a Next.js (App Router / RSC) page with no
 * public JSON API: the full match dataset is embedded in the initial HTML
 * inside `self.__next_f.push([1, "..."])` script tags as an escaped JSON
 * string (React Server Components flight payload). This extracts and
 * parses that payload rather than using cheerio selectors.
 *
 * Note: `matchStartDate` always carries a `+00:00` suffix even though the
 * time-of-day is the Irish *local* kickoff time (not true UTC) — see
 * `parseMatchDate` below.
 */
import { pathToFileURL } from "node:url";
import { BaseScraper, type ScrapedFixture } from "../base";
import {
  getOrCreateCompetition,
  getOrCreateSport,
  getOrCreateTeam,
  getOrCreateVenue,
  upsertFixture,
} from "../db-helpers";

const FIXTURES_URL = "https://www.gaa.ie/fixtures-results";
const COMPETITION_WEBSITE = "https://www.gaa.ie";

const FOOTBALL_CUP_NAME = "GAA Football All-Ireland Senior Championship";
const HURLING_CUP_NAME = "GAA Hurling All-Ireland Senior Championship";

const SPORTS = {
  [FOOTBALL_CUP_NAME]: { slug: "gaa-football", name: "GAA Football" },
  [HURLING_CUP_NAME]: { slug: "gaa-hurling", name: "GAA Hurling" },
} as const;

interface GaaMatch {
  matchId: string;
  roundName: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  matchStartDate: string; // e.g. "2026-05-23T14:00:00+00:00" (local IE time, mislabeled offset)
  isTbc: boolean;
  isResult: boolean;
  score: {
    homeGoals: number;
    awayGoals: number;
    homePoints: number;
    awayPoints: number;
  } | null;
  stadium: { stadiumName: string } | null;
  competition: { cupName: string };
}

interface GaaScrapedFixture extends ScrapedFixture {
  externalRef: string;
  cupName: typeof FOOTBALL_CUP_NAME | typeof HURLING_CUP_NAME;
}

function scoreDisplay(goals: number, points: number): string {
  return `${goals}-${points.toString().padStart(2, "0")}`;
}

/** Ireland's kickoff wall-clock time, ignoring the source's bogus +00:00 offset. */
export function parseMatchDate(iso: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} | null {
  const match = iso.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
  );
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
}

/**
 * Extracts the embedded RSC flight JSON array of match objects from the raw
 * page HTML.
 *
 * Next.js streams each flight "id" across multiple `self.__next_f.push`
 * calls; a single id's pushes must be concatenated before splitting on `\n`
 * into individual `<hex>:<json>` records — treating each push call as a
 * standalone JSON fragment (as if one push == one record) is unreliable:
 * the boundary between records shifts between requests, sometimes landing
 * mid-record.
 */
export function extractMatches(html: string): GaaMatch[] {
  const chunkRe = /self\.__next_f\.push\(\[(\d+),"((?:[^"\\]|\\.)*)"\]\)/g;
  const byId = new Map<string, string>();
  let match: RegExpExecArray | null;
  while ((match = chunkRe.exec(html))) {
    const [, id, content] = match;
    byId.set(id, (byId.get(id) ?? "") + content);
  }

  for (const content of byId.values()) {
    let unescaped: string;
    try {
      unescaped = JSON.parse(`"${content}"`);
    } catch {
      continue;
    }

    for (const line of unescaped.split("\n")) {
      if (!line.includes('"matchId"')) continue;
      const withoutFlightPrefix = line.replace(/^[0-9a-f]+:/, "");
      try {
        const parsed = JSON.parse(withoutFlightPrefix);
        if (Array.isArray(parsed) && parsed.some((m) => m?.matchId)) {
          return parsed as GaaMatch[];
        }
      } catch {
        continue;
      }
    }
  }

  return [];
}

class GaaScraper extends BaseScraper {
  get name() {
    return "gaa";
  }

  async scrape(): Promise<GaaScrapedFixture[]> {
    this.logInfo(`fetching ${FIXTURES_URL}`);
    const html = await this.fetchText(FIXTURES_URL);
    const matches = extractMatches(html);
    this.logInfo(`found ${matches.length} total match record(s) on page`);

    const fixtures: GaaScrapedFixture[] = [];

    for (const m of matches) {
      const cupName = m.competition?.cupName;
      if (cupName !== FOOTBALL_CUP_NAME && cupName !== HURLING_CUP_NAME) {
        continue;
      }
      if (m.isTbc) {
        this.logInfo(`skipping TBC fixture: ${m.homeTeam?.name} v ${m.awayTeam?.name}`);
        continue;
      }

      const dateParts = parseMatchDate(m.matchStartDate);
      if (!dateParts) {
        this.logError(`skipping fixture with unparsable date: "${m.matchStartDate}"`);
        continue;
      }

      const hasScore =
        m.isResult &&
        m.score &&
        Number.isFinite(m.score.homeGoals) &&
        Number.isFinite(m.score.awayGoals);

      const status: ScrapedFixture["status"] = hasScore
        ? "COMPLETED"
        : "SCHEDULED";

      fixtures.push({
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        startTimeUTC: JSON.stringify(dateParts), // resolved to real UTC in persist()
        venueName: m.stadium?.stadiumName ?? null,
        round: `${cupName} ${m.roundName}`.trim(),
        competitionSlug: SPORTS[cupName].slug,
        status,
        result: hasScore
          ? {
              homeScoreDisplay: scoreDisplay(m.score!.homeGoals, m.score!.homePoints),
              awayScoreDisplay: scoreDisplay(m.score!.awayGoals, m.score!.awayPoints),
              scoreData: {
                homeGoals: m.score!.homeGoals,
                homePoints: m.score!.homePoints,
                homeTotal: m.score!.homeGoals * 3 + m.score!.homePoints,
                awayGoals: m.score!.awayGoals,
                awayPoints: m.score!.awayPoints,
                awayTotal: m.score!.awayGoals * 3 + m.score!.awayPoints,
              },
            }
          : undefined,
        externalRef: m.matchId,
        cupName,
      });
    }

    return fixtures;
  }
}

async function persist(season: number, scraped: GaaScrapedFixture[]) {
  const { zonedWallTimeToUtc } = await import("../../lib/timezones");

  let inserted = 0;
  let updated = 0;

  for (const fixture of scraped) {
    const sportMeta = SPORTS[fixture.cupName];

    const sport = await getOrCreateSport(sportMeta.slug, sportMeta.name);
    const competition = await getOrCreateCompetition({
      sportId: sport.id,
      slug: `${sportMeta.slug}-all-ireland-${season}`,
      name: `${fixture.cupName} ${season}`,
      season: String(season),
      isLocked: true,
      authorityType: "SCRAPED",
      websiteUrl: COMPETITION_WEBSITE,
    });

    const homeTeam = await getOrCreateTeam({
      sportId: sport.id,
      sportSlug: sportMeta.slug,
      name: fixture.homeTeam,
    });
    const awayTeam = await getOrCreateTeam({
      sportId: sport.id,
      sportSlug: sportMeta.slug,
      name: fixture.awayTeam,
    });
    const venue = fixture.venueName
      ? await getOrCreateVenue(fixture.venueName, {
          country: "Ireland",
          timezone: "Europe/Dublin",
        })
      : null;

    const dateParts = JSON.parse(fixture.startTimeUTC) as {
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
    };
    const scheduledStartTime = zonedWallTimeToUtc(dateParts, "Europe/Dublin");

    const result = await upsertFixture({
      competitionId: competition.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      venueId: venue?.id ?? null,
      externalRef: fixture.externalRef,
      scheduledStartTime,
      status: fixture.status,
      homeScoreDisplay: fixture.result?.homeScoreDisplay ?? null,
      awayScoreDisplay: fixture.result?.awayScoreDisplay ?? null,
      scoreData: fixture.result?.scoreData ?? null,
      trustStatus: "OFFICIAL",
    });

    if (result.action === "inserted") inserted++;
    else updated++;
  }

  return { inserted, updated };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const seasonArg = args.find((a) => a.startsWith("--season="));
  const season = seasonArg
    ? Number(seasonArg.split("=")[1])
    : new Date().getFullYear();

  const scraper = new GaaScraper();
  const allFixtures = await scraper.scrape();
  const fixtures = allFixtures.filter((f) => {
    const parts = JSON.parse(f.startTimeUTC) as { year: number };
    return parts.year === season;
  });

  if (dryRun) {
    console.log(JSON.stringify(fixtures, null, 2));
    console.error(`\n${fixtures.length} fixture(s) parsed for ${season} (dry run, not written to DB)`);
    return;
  }

  const { inserted, updated } = await persist(season, fixtures);
  console.log(
    `GAA All-Ireland ${season}: ${fixtures.length} parsed, ${inserted} inserted, ${updated} updated.`,
  );
  process.exit(0);
}

// Only auto-run when executed directly (`tsx .../index.ts`), not when
// imported as a module — e.g. by tests importing the pure parsing helpers
// above, which must not trigger a live network scrape.
const isMainModule =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  main().catch((err) => {
    console.error("[gaa] scrape failed:", err);
    process.exit(1);
  });
}
