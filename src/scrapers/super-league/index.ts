/**
 * Betfred Super League (Rugby League) scraper.
 *
 * The official superleague.co.uk site returns HTTP 500 to non-browser
 * clients on its fixtures/results pages (WAF/bot defense), and BBC Sport's
 * equivalent page renders fixtures client-side with no data in the initial
 * HTML. Wikipedia's per-season "<year> Super League season results" article
 * publishes the same data in plain, static round-by-round HTML tables and
 * is used here instead.
 */
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { BaseScraper, type ScrapedFixture } from "../base";
import { getOrCreateCompetition, getOrCreateSport, getOrCreateTeam, getOrCreateVenue, slugify, upsertFixture } from "../db-helpers";

const SPORT_SLUG = "rugby-league";
const SPORT_NAME = "Rugby League";
const COMPETITION_WEBSITE = "https://www.superleague.co.uk";

interface SuperLeagueFixture extends ScrapedFixture {
  externalRef: string;
}

function cleanCellText($el: Cheerio<AnyNode>): string {
  return $el.text().replace(/\s+/g, " ").trim();
}

const FIXTURE_TABLE_COLUMNS = 7; // Home, Score, Away, Date, Venue, Referee, Attendance

/**
 * Expands a fixture table's rows into a fixed-width grid, resolving
 * `rowspan` on shared cells (Wikipedia merges Date/Venue/Attendance across
 * same-day double-headers, e.g. Magic Weekend) by repeating the spanning
 * cell for the rows it covers.
 */
function buildFixtureGrid(
  table: Cheerio<AnyNode>,
  $: CheerioAPI,
): Cheerio<AnyNode>[][] {
  const carry: Array<{ cell: Cheerio<AnyNode>; remaining: number } | null> =
    new Array(FIXTURE_TABLE_COLUMNS).fill(null);
  const grid: Cheerio<AnyNode>[][] = [];

  const rows = table.children("tbody").children("tr").toArray();
  for (const row of rows) {
    const tds = $(row)
      .find("td")
      .toArray()
      .map((el: AnyNode) => $(el));
    if (tds.length === 0) continue; // header / separator rows

    const outRow: Cheerio<AnyNode>[] = [];
    let nextTd = 0;
    for (let col = 0; col < FIXTURE_TABLE_COLUMNS; col++) {
      const carried = carry[col];
      if (carried && carried.remaining > 0) {
        outRow.push(carried.cell);
        carried.remaining--;
        if (carried.remaining === 0) carry[col] = null;
        continue;
      }
      const cell = tds[nextTd++];
      if (!cell) {
        outRow.push($(null as never)); // shouldn't happen; keeps indices aligned
        continue;
      }
      outRow.push(cell);
      const rowspan = Number(cell.attr("rowspan") ?? "1");
      if (rowspan > 1) carry[col] = { cell, remaining: rowspan - 1 };
    }
    grid.push(outRow);
  }

  return grid;
}

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function parseWikipediaDate(text: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} | null {
  const match = text.match(
    /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/,
  );
  if (!match) return null;
  const [, day, monthName, year, hour, minute] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (!month) return null;
  return {
    year: Number(year),
    month,
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
}

function parseScore(
  text: string,
): { home: number; away: number } | "POSTPONED" | null {
  const stripped = text
    .replace(/\([^)]*\)/g, "") // drop "(g.p.)" golden-point annotations etc.
    .replace(/–|—/g, "-") // en/em dash -> hyphen
    .trim();

  if (/postp/i.test(text) || /awarded/i.test(text)) return "POSTPONED";

  const match = stripped.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) return null; // blank / "-" only / not yet played
  return { home: Number(match[1]), away: Number(match[2]) };
}

class SuperLeagueScraper extends BaseScraper {
  get name() {
    return "super-league";
  }

  constructor(private season: number) {
    super();
  }

  async scrape(): Promise<SuperLeagueFixture[]> {
    const url = `https://en.wikipedia.org/wiki/${this.season}_Super_League_season_results`;
    this.logInfo(`fetching ${url}`);
    const $ = await this.fetchHtml(url);

    const fixtures: SuperLeagueFixture[] = [];

    $('section[aria-labelledby^="Round_"]').each((_, section) => {
      const roundId = $(section).attr("aria-labelledby") ?? "";
      const round = roundId.replace(/_/g, " ");

      const table = $(section).find("table").first();
      if (table.length === 0) return;

      const grid = buildFixtureGrid(table, $);
      for (const cells of grid) {
        const homeTeam = cleanCellText(cells[0].find("a").last());
        const scoreText = cleanCellText(cells[1]);
        const awayTeam = cleanCellText(cells[2].find("a").last());
        const dateText = cleanCellText(cells[3]);
        const venueName = cleanCellText(cells[4].find("a").last()) || null;

        if (!homeTeam || !awayTeam) continue;

        const dateParts = parseWikipediaDate(dateText);
        if (!dateParts) {
          this.logError(`skipping fixture with unparsable date: "${dateText}" (${homeTeam} v ${awayTeam})`);
          continue;
        }

        const score = parseScore(scoreText);
        const status: ScrapedFixture["status"] =
          score === "POSTPONED"
            ? "POSTPONED"
            : score
              ? "COMPLETED"
              : "SCHEDULED";

        const externalRef = `sl-${this.season}-${slugify(round)}-${slugify(homeTeam)}-${slugify(awayTeam)}`;

        fixtures.push({
          homeTeam,
          awayTeam,
          startTimeUTC: JSON.stringify(dateParts), // resolved to real UTC in persist()
          venueName,
          round,
          competitionSlug: `super-league-${this.season}`,
          status,
          result:
            score && score !== "POSTPONED"
              ? {
                  homeScoreDisplay: String(score.home),
                  awayScoreDisplay: String(score.away),
                }
              : undefined,
          externalRef,
        });
      }
    });

    return fixtures;
  }
}

async function persist(season: number, scraped: SuperLeagueFixture[]) {
  const { zonedWallTimeToUtc } = await import("../../lib/timezones");

  const sport = await getOrCreateSport(SPORT_SLUG, SPORT_NAME);
  const competition = await getOrCreateCompetition({
    sportId: sport.id,
    slug: `super-league-${season}`,
    name: `Super League ${season}`,
    season: String(season),
    isLocked: true,
    authorityType: "SCRAPED",
    websiteUrl: COMPETITION_WEBSITE,
  });

  let inserted = 0;
  let updated = 0;

  for (const fixture of scraped) {
    const homeTeam = await getOrCreateTeam({
      sportId: sport.id,
      name: fixture.homeTeam,
    });
    const awayTeam = await getOrCreateTeam({
      sportId: sport.id,
      name: fixture.awayTeam,
    });
    const venue = fixture.venueName
      ? await getOrCreateVenue(fixture.venueName, {
          country: "England",
          timezone: "Europe/London",
        })
      : null;

    const dateParts = JSON.parse(fixture.startTimeUTC) as {
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
    };
    const scheduledStartTime = zonedWallTimeToUtc(dateParts, "Europe/London");

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

  const scraper = new SuperLeagueScraper(season);
  const fixtures = await scraper.scrape();

  if (dryRun) {
    console.log(JSON.stringify(fixtures, null, 2));
    console.error(`\n${fixtures.length} fixture(s) parsed (dry run, not written to DB)`);
    return;
  }

  const { inserted, updated } = await persist(season, fixtures);
  console.log(
    `Super League ${season}: ${fixtures.length} parsed, ${inserted} inserted, ${updated} updated.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("[super-league] scrape failed:", err);
  process.exit(1);
});
