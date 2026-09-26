# Scrapers

Adapters live in `gaa/` and `super-league/`, sharing `base.ts` (adapter
interface + HTTP client) and `db-helpers.ts`. Always run standalone with
`tsx --env-file=.env`, and use `--dry-run` to test parsing without DB writes.

## Idempotency

- Lives in `upsertFixture` (`db-helpers.ts`), keyed on `fixtures.externalRef`
  (unique per competition). Not in the runner.
- A rescheduled kickoff must update the existing row, never insert a new one.

## Teams

- `getOrCreateTeam` matches by exact sport-namespaced slug. Always pass
  `sportSlug`.
- `match-teams.ts` (`similarity`, `findBestTeamMatch`, Levenshtein) was built
  for plan 2.1 but nothing calls it. Exact slug matching has been enough
  because both sources name teams consistently. Don't delete it without
  checking for new callers, and don't assume it's wired in.

## Super League (Wikipedia)

- `superleague.co.uk` returns HTTP 500 to non-browser clients on `/fixtures`
  and `/results`. BBC Sport renders client-side with no fixture data in the
  initial HTML. So the scraper reads Wikipedia's
  `{season}_Super_League_season_results` article.
- Wikipedia merges Date/Venue/Attendance cells with `rowspan` across same-day
  fixtures (e.g. Magic Weekend). Parsing walks a rowspan-aware grid
  (`buildFixtureGrid` in `super-league/index.ts`), not fixed cell indices.
- No per-fixture broadcaster in this source, so `broadcastInfo` stays empty.

## GAA (gaa.ie flight payload)

- `gaa.ie/fixtures-results` has no public JSON API. Match data is embedded as
  a React Server Components flight payload in `self.__next_f.push([id, "..."])`
  script tags.
- Concatenate all pushes for a given flight id *before* splitting on `\n`
  into `<hex>:<json>` records. Chunk boundaries shift between requests, so
  parsing each `push()` alone fails intermittently. See `extractMatches` in
  `gaa/index.ts`.
- `matchStartDate` always has a `+00:00` suffix, but the time-of-day is Irish
  local kickoff time, not true UTC.
- Broadcaster is never mapped, so `broadcastInfo` stays empty here too.

## Runner and cron

- `runner.ts` (`npm run scrape`) spawns each adapter as a child process so one
  adapter crashing or calling `process.exit()` can't kill the others.
- `runner.ts` and the cron route (`src/app/api/cron/scrape/route.ts`) share
  `run-adapters.ts` (`ADAPTERS` + `runAdapter`). The CLI streams output
  (`inherit`); the route uses `capture: true` and returns a JSON summary
  (`{ league, success, exitCode, log }[]`).
- **Don't use `require.resolve("tsx/cli")`.** A literal specifier makes
  Turbopack try to inline tsx's internals (including esbuild) into the route
  bundle ("Unknown module type"). A computed specifier fails at runtime
  because Turbopack's `require` shim rejects it as "too dynamic".
  `resolveTsxCli()` walks `node_modules` with `fs.existsSync` instead.
- `ADAPTERS[].entry` is built from `process.cwd()`, not `__dirname`. Under
  plain tsx `__dirname` is `src/scrapers`, but inside the Next bundle it points
  under `.next/server/`. `process.cwd()` is the project root in both.

## Crests

- `team-crests.ts` maps sport-namespaced slugs to crest URLs from Wikipedia's
  REST summary API (`en.wikipedia.org/api/rest_v1/page/summary/<title>`).
  `getOrCreateTeam` sets `crestUrl` on insert, so reseeds and rescrapes get
  crests automatically.
- These are trademarked marks. Verify licensing per team before any public
  deployment.
- Community-submitted teams never get a mapped crest and fall back to the
  monogram in `FixtureCard`. Expected, not a bug.
- The summary API rate-limits hard. When backfilling, space requests ~1.5s
  apart and retry 429s with backoff.