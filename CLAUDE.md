# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

A mobile-first sports fixture and calendar platform for under-served sports:
GAA Football & Hurling, Rugby League / Super League, Roller Derby, and grassroots
club sports. Fixtures come from two sources — automated scrapers for official
leagues, and community submissions for grassroots competitions — and are
delivered via a public REST API, dynamic iCal/webcal feeds, and a Next.js web
portal.

Full phased plan: `plan.md`. Work through it **one sub-phase at a time**, in
order, running that sub-phase's verification command before moving on.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components, Server Actions).
  `agentRules: false` is set in `next.config.ts` to stop `next dev` from
  auto-generating its own agent-rules block into this file.
- **Styling**: Tailwind CSS + Lucide Icons + Shadcn UI primitives
- **Database & ORM**: PostgreSQL 16 (Docker Compose) + Drizzle ORM
- **Auth**: Auth.js / NextAuth (OAuth & Magic Links)
- **Calendar**: `ical-generator` for RFC 5545 `.ics` / `webcal://` feeds
- **Scrapers**: Modular Node/TypeScript adapters using `cheerio` + native `fetch`

## Project Structure

```text
sports-fixtures/
├── docker-compose.yml       # Local Postgres container
├── drizzle.config.ts        # Drizzle migration configuration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/          # Public REST API (fixtures, teams, competitions)
│   │   │   └── calendar/    # Dynamic .ics / webcal endpoints
│   │   ├── (web)/           # Public web UI routes
│   │   └── layout.tsx
│   ├── components/          # FixtureCard, CalendarModal, etc.
│   ├── db/
│   │   ├── index.ts         # Drizzle client instance
│   │   └── schema.ts        # Full database schema & relationships
│   ├── lib/
│   │   ├── calendar.ts      # iCal event formatting utilities
│   │   └── timezones.ts     # Localized date-time helpers
│   └── scrapers/
│       ├── base.ts          # Base adapter interface & HTTP client
│       ├── gaa/
│       ├── super-league/
│       └── runner.ts        # CLI runner (`npm run scrape`)
└── package.json
```

## Core Domain Model

- `sports` — id, slug, name, icon
- `competitions` — id, sportId, slug, name, season, **isLocked**, authorityType
  (`SCRAPED` | `COMMUNITY`), websiteUrl
- `teams` — id, sportId, slug, name, shortName, crestUrl, homeVenueId
- `venues` — id, name, address, city, country, latitude, longitude, timezone
- `fixtures` — id, competitionId, homeTeamId, awayTeamId, venueId,
  scheduledStartTime, status (`SCHEDULED` | `POSTPONED` | `CANCELLED` |
  `COMPLETED`), broadcastInfo, streamUrl, homeScoreDisplay, awayScoreDisplay,
  scoreData (jsonb), **trustStatus** (`OFFICIAL` | `COMMUNITY_VERIFIED` |
  `NEEDS_VERIFICATION`), submittedByUserId (null for scraped fixtures)
- `fixture_proposals` — id, fixtureId, proposedStartTime, proposedVenueId,
  reason, proofUrl, status, netVotes
- `votes` — id, targetType (`FIXTURE` | `PROPOSAL`), targetId, userId,
  direction (+1 / -1), unique on `(userId, targetType, targetId)`
- `users` / `accounts` / `sessions` / `verification_tokens` — Auth.js's
  Postgres adapter tables (see the Auth.js gotcha note below)

## Governance Rules (critical — do not violate)

This is the load-bearing rule of the whole platform: **who is allowed to
change a fixture depends on whether its competition is locked.**

- **Locked competitions** (`isLocked = true`, `authorityType = 'SCRAPED'`,
  e.g. Super League, GAA All-Ireland): fixtures are written only by scrapers,
  with `trustStatus = 'OFFICIAL'`. Community users can never create, edit, or
  vote to change these fixtures directly. They may only file a **"Report
  Discrepancy"** dispute (reason + source URL) — this never mutates the
  official fixture.
- **Unlocked / community competitions** (`isLocked = false`,
  `authorityType = 'COMMUNITY'`, e.g. Roller Derby, local clubs): fixtures may
  be submitted by authenticated users, always starting at
  `trustStatus = 'NEEDS_VERIFICATION'` and always requiring a **mandatory
  proof URL**.
- **Submission form must hard-block** any attempt to submit into a locked
  competition, with a friendly message ("Official fixtures for this league
  are managed automatically").
- **Promotion rule**: a community fixture is auto-promoted from
  `NEEDS_VERIFICATION` to `COMMUNITY_VERIFIED` once it reaches **+3 net
  votes**. Voting is one vote per user per target, enforced by a unique
  constraint.
- Scrapers must be **idempotent**: re-running must update changed fields
  (e.g. rescheduled kickoff) on the existing row, never insert duplicates.
- Standalone TypeScript scripts run via `tsx` (seed, scrapers) do **not**
  auto-load `.env` the way Next.js does — invoke them with
  `tsx --env-file=.env <script>` (already wired into the `npm run db:seed`
  / `npm run scrape` scripts).
- **Super League source note**: superleague.co.uk returns HTTP 500 to
  non-browser clients on `/fixtures` and `/results` (bot defense), and BBC
  Sport's equivalent page renders client-side with no fixture data in the
  initial HTML. The scraper instead reads Wikipedia's
  `{season}_Super_League_season_results` article, which is static HTML but
  has irregular table markup: `rowspan` merges the Date/Venue/Attendance
  cells across same-day fixtures (e.g. Magic Weekend), so parsing walks a
  rowspan-aware grid rather than fixed cell indices — see
  `buildFixtureGrid` in `src/scrapers/super-league/index.ts`. Per-fixture
  broadcaster isn't available from this source.
- **GAA source note**: gaa.ie/fixtures-results has no public JSON API — the
  match data is embedded in the initial HTML as a React Server Components
  "flight" payload (`self.__next_f.push([id, "..."])` script tags). A given
  flight id's pushes must be concatenated *before* splitting on `\n` into
  individual `<hex>:<json>` records; treating each `push()` call as a
  self-contained JSON fragment is unreliable — the chunk boundary shifts
  between requests. See `extractMatches` in `src/scrapers/gaa/index.ts`.
  Also note: `matchStartDate` always carries a `+00:00` suffix even though
  the time-of-day is Irish *local* kickoff time, not true UTC.
- **Team slugs are namespaced per sport** (e.g. `gaa-football-cork` vs.
  `gaa-hurling-cork`), not just per name — `teams.slug` is globally unique,
  and the same name (a GAA county, etc.) can field separate teams across
  different sports. Always pass `sportSlug` to `getOrCreateTeam`
  (`src/scrapers/db-helpers.ts`).
- `src/scrapers/runner.ts` (`npm run scrape`) spawns each adapter as a
  child process rather than importing them in-process, so one adapter's
  crash or `process.exit()` can't kill the others. Idempotency itself
  lives in `upsertFixture` (`fixtures.externalRef`, unique per
  competition), not in the runner.
- The calendar routes (`/api/calendar/team/[slug]/route.ts` and
  `.../competition/[slug]/route.ts`) accept the slug with or without a
  trailing `.ics` — the dynamic segment captures it literally
  (`rugby-league-wigan-warriors.ics`), so the handler strips `.ics` before
  the DB lookup rather than the folder name encoding the extension.
- **Don't use `next-themes`** for dark mode on this stack — its
  `ThemeProvider` renders a `<script>` tag from a client component, which
  trips a React 19 dev-only warning ("script tags are never executed when
  rendering on the client") on this Next.js 16.3.6 / React 19.2.8 combo.
  Even a plain server-rendered `<script>` or `next/script` (any strategy)
  triggers the same *dev console* warning — it's cosmetic noise absent from
  production builds, not a real bug, so `next/script` is still what
  `app/layout.tsx` uses for the blocking pre-hydration theme script
  (`src/lib/theme-script.ts`, applies the saved/system theme class before
  paint to avoid a flash).
- **The real bug was separate**: `ThemeToggle` originally read the DOM's
  actual theme class via a `useState` lazy initializer so its icon would be
  correct on first paint — but the server has no `document`, so server and
  first-client-render disagreed, causing a genuine hydration mismatch
  (React error #418, reproduced in a production build, not just a dev
  warning). Fixed by always rendering the default (light) icon on first
  render — matching the server exactly — then correcting from real DOM
  state in a mount effect. Don't reintroduce the lazy-initializer version.
- **"Live" isn't a stored fixture status** — the schema only has
  `SCHEDULED`/`POSTPONED`/`CANCELLED`/`COMPLETED`. `FixtureCard` derives a
  "Live" pill display-side when a `SCHEDULED` fixture's kickoff has passed
  but is still within the assumed ~2h match window (see `displayStatus` in
  `src/components/FixtureCard.tsx`). Don't add a `LIVE` DB enum value for
  this.
- The homepage's day filter (`src/app/page.tsx`) buckets fixtures by UTC
  calendar day (`[00:00, 24:00)` UTC for the requested date), not the
  viewer's local day — a fixture just after midnight UTC-local-evening can
  land on what looks like the "wrong" day for some timezones. Acceptable
  for now; revisit only if it becomes a real complaint.
- **`/teams/[slug]` and `/competitions/[slug]` pages exist** (added in 4.3)
  even though the plan never allocated them their own sub-phase — the
  "Subscribe" button needed for 4.3 has to live somewhere, and "team pages
  and competition headers" per the plan's own 4.3 prompt implies they
  exist. Each is a minimal Server Component: header + Subscribe button +
  that team's/competition's fixtures via `FixtureCard`. `FixtureCard`'s
  team name and competition name link here. There's still no `/teams` or
  `/competitions` *list* page — `BottomNav`'s "Teams" entry stays disabled
  until one exists.
- **UI design system (5.1)**: the fan portal uses a deep slate/zinc dark
  mode with a single custom accent color (`--accent`, defined in
  `src/app/globals.css` and exposed as Tailwind's `bg-accent` /
  `text-accent` / etc via `@theme inline`) — not stock Tailwind
  emerald/green — plus `--surface`/`--border` tokens for cards. Team
  crests without a `crestUrl` render as a monogram whose color is a
  deterministic hash of the team name (`nameHue` in `FixtureCard.tsx`), so
  the same team gets the same color everywhere. Kickoff times and scores
  use `font-mono` (scoreboard feel); everything else uses the default
  Geist Sans.
- **Auth.js (5.1)**: `next-auth@beta` (v5) configured in `src/auth.ts`
  with `@auth/drizzle-adapter` and database sessions (not JWT), GitHub as
  the sole OAuth provider for now. The adapter's TypeScript types for the
  Postgres `accounts` table require the JS object keys themselves to be
  snake_case (`refresh_token`, `access_token`, `expires_at`, `token_type`,
  `id_token`, `session_state`) — unlike every other table in this schema,
  which uses camelCase JS keys mapped to snake_case DB columns. Don't
  "fix" this back to camelCase; it fails to typecheck against
  `DefaultPostgresAccountsTable`. Sign-in requires `AUTH_GITHUB_ID` /
  `AUTH_GITHUB_SECRET` in `.env` from a GitHub OAuth App (Homepage
  `http://localhost:3000`, Callback
  `http://localhost:3000/api/auth/callback/github`) — until those are
  set, the "Sign in" button renders fine but the OAuth handshake will
  fail. `trustHost: true` is set because local dev runs on whatever port
  is free (see below), not a fixed `NEXTAUTH_URL`. The route handler is
  `src/app/api/auth/[...nextauth]/route.ts`; UI lives in
  `src/components/AuthButton.tsx` (a Server Component using inline Server
  Actions for sign-in/sign-out, rendered from `Header.tsx`). Database
  sessions don't put the user id on `session.user` by default — added via
  a `session` callback in `src/auth.ts` plus a module augmentation in
  `src/types/next-auth.d.ts` so `session.user.id` typechecks.
- **Grassroots fixture submission (5.2)**: reachable via the floating "+"
  button in `src/app/layout.tsx` (`SubmitFixtureButton` -> the modal
  `SubmitFixtureModal`, submitting to the Server Action in
  `src/app/actions/submit-fixture.ts`, validated with `zod` in
  `src/lib/validation/fixture-submission.ts`). The competition `<select>`
  is only ever populated from unlocked competitions, and the action
  independently re-checks `competition.isLocked` server-side (a tampered
  request could otherwise target a locked competition directly) —
  returning the exact message from the plan: "Official fixtures for this
  league are managed automatically." Home/away teams and the venue are
  free-text and resolved with the scrapers' own `getOrCreateTeam` /
  `getOrCreateVenue` helpers (`src/scrapers/db-helpers.ts`) — reused as-is
  rather than duplicated, since a grassroots club's team may not exist
  yet. New fixtures get `trustStatus = 'NEEDS_VERIFICATION'`. There is no
  separate audit-log table — the mandatory proof URL and submission
  reason are recorded as a `fixture_proposals` row with
  `status = 'ACCEPTED'` (reusing that table as the audit trail for the
  *initial* submission, not just for later proposed changes to an
  existing fixture). A `"use server"` file can only export async
  functions, so `SubmitFixtureState` / `initialSubmitFixtureState` live in
  the validation file instead of the actions file — don't move them back.
- The seed script (`src/db/seed.ts`) also creates one unlocked
  `roller-derby-community-league-2026` competition — without it there is
  nothing for the submission form's competition picker to list.
- **Voting & verification (5.3)**: `fixtures` has no stored net-vote
  counter (only `fixture_proposals.netVotes` exists, and that's unused by
  this flow) — net votes are computed on demand with a `sum(direction)`
  query in `src/lib/votes.ts` (`getVoteInfoForFixtures` for batched
  reads, `castVoteForUser` for the write path + the +3 auto-promotion
  check). `castVoteForUser` is a plain async function, not itself a
  Server Action — `src/app/actions/vote.ts`'s `castVoteAction` is a thin
  wrapper that resolves `session.user.id` from `auth()` and delegates to
  it. This split exists so the vote/promotion logic can be exercised
  directly from multiple simulated users without needing that many real
  signed-in sessions; keep using `castVoteForUser` for that rather than
  re-deriving the logic. Clicking the same direction twice removes the
  vote (toggle off); clicking the opposite direction flips it — there's
  no separate "remove vote" control.
  `FixtureCard` shows the vote widget (▲ count ▼) only for non-`OFFICIAL`
  fixtures and a "Report" button only for `OFFICIAL` ones — this is
  purely a `trustStatus` check, no extra join needed, since only scraped
  fixtures are ever `OFFICIAL` in this domain model. Both the vote action
  and the Report Discrepancy action (`src/app/actions/report-discrepancy.ts`)
  re-check `competition.isLocked` server-side as defense in depth, mirroring
  the same pattern from 5.2. There's no dedicated "sign in to interact"
  prompt wired into the vote/report buttons themselves (unlike the
  submission modal, which does have one) — signed-out users just see them
  disabled with a tooltip pointing at the header's sign-in button. This
  was a deliberate scope call to avoid threading a bound `signIn` server
  action through three different pages into `FixtureCard`; revisit if it
  becomes a real UX complaint.
- **PWA & offline support (6.1)**: `src/app/manifest.ts` uses Next's file
  convention (not a static `public/manifest.json`) — Next serves it at
  `/manifest.webmanifest` and auto-injects the `<link rel="manifest">`
  itself, so don't also set `metadata.manifest` (that produced a
  duplicate/wrong link when tried). Icons (`public/icon-192.png`,
  `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`) were
  rasterized once from `public/icon.svg` via a throwaway script using
  `sharp` (already a transitive dependency of Next's image
  optimization — not added to `package.json`); regenerate them the same
  way if `icon.svg` ever changes, there's no build-time step that does
  this automatically. iOS install support comes from
  `metadata.appleWebApp` in `src/app/layout.tsx` — Next 16 emits the
  modern `mobile-web-app-capable` meta tag (not the deprecated
  `apple-mobile-web-app-capable`) plus the Apple-specific title/status-bar
  tags; this is correct, not a regression, if you go looking for the old
  tag name. Offline caching is a **hand-rolled** service worker
  (`public/sw.js`, registered by `src/components/ServiceWorkerRegister.tsx`)
  rather than `next-pwa` — that plugin's Webpack-era integration doesn't
  have a clean Turbopack story yet. It's deliberately simple: network-first
  for navigations and API/RSC data requests (falling back to the last
  cached response, or `/offline` if nothing is cached), cache-first for
  hashed `/_next/static/` assets. `/offline` (`src/app/offline/page.tsx`)
  is precached on SW install specifically so it's available even on a
  first-ever visit that immediately goes offline. Verified by actually
  killing the dev server (not devtools network throttling, which these
  tools can't drive) and confirming a previously-visited page still
  rendered fully while an unvisited one fell back to `/offline`, then
  confirming a normal page load again once the server came back.
  **`ServiceWorkerRegister` only registers `sw.js` in production**
  (`process.env.NODE_ENV === "production"`) — in any other environment it
  actively unregisters and clears caches instead. This was a real bug,
  not a precaution: the service worker was first registered and tested
  under `npm run start` on `localhost:3000`, and a service worker
  persists per-origin in the browser regardless of which server process
  is behind it — so it kept intercepting requests and serving the
  precached `/offline` page after switching to `npm run dev` on the same
  origin, even though the dev server was running fine. If a "you're
  offline" false-positive ever comes back, suspect a stale registration
  from testing under `next start` again, not this guard.
- **Cron ingestion (6.2)**: `src/scrapers/runner.ts` (the CLI) and
  `src/app/api/cron/scrape/route.ts` (the cron endpoint) now share
  `src/scrapers/run-adapters.ts` (`ADAPTERS` + `runAdapter`) instead of
  the runner duplicating that logic — the route calls `runAdapter` with
  `capture: true` per adapter and returns a JSON summary (`{ league,
  success, exitCode, log }[]`), while the CLI keeps streaming
  (`inherit`) output. **Don't use `require.resolve("tsx/cli")`** to find
  tsx's own CLI entry (needed because both the runner and the route spawn
  it as a child process to run each `.ts` adapter file directly) — a
  literal `require.resolve("tsx/cli")` makes Turbopack's build-time
  tracer try to inline tsx's entire internals (including its esbuild
  binary) into the cron route's bundle ("Unknown module type"); a
  computed specifier (`["tsx","cli"].join("/")`) dodges that but then
  fails *at runtime* instead, because Turbopack's compiled `require` shim
  rejects any non-literal specifier as "too dynamic". `resolveTsxCli()`
  in `run-adapters.ts` sidesteps both by walking `node_modules` with
  plain `fs.existsSync` checks — no module resolution machinery involved,
  so neither bundler nor runtime ever sees a `require()` call on tsx
  itself. For the same reason, `ADAPTERS[].entry` is built from
  `process.cwd()` rather than `__dirname` — `__dirname` is the real
  `src/scrapers` directory when this module runs under the plain `tsx`
  CLI, but resolves to wherever Turbopack physically places the bundled
  chunk (under `.next/server/`) when the same module is imported by the
  Next-bundled route handler; `process.cwd()` is the project root in both
  cases. The route is unauthenticated-safe only because of the
  `CRON_SECRET` bearer-token check — there's no other access control on
  `/api/cron/scrape`. **Setting up the actual scheduled trigger is a
  manual step for whoever deploys this** — `.github/workflows/scrape.yml`
  needs `CRON_SECRET` and `SCRAPE_BASE_URL` (the deployed app's base URL)
  added as GitHub repo secrets; this repo has no deployment configured,
  so there's nothing for the workflow to hit yet. Verified locally by
  running the plan's own verification command
  (`curl -H "Authorization: Bearer test_secret" .../api/cron/scrape`)
  against the real scrapers (not a mock) — both adapters ran, parsed live
  data, and idempotently updated existing fixture rows (0 inserted, as
  expected since they were already seeded) — and by confirming
  `npm run scrape` still works unchanged after the `runner.ts` refactor.

```bash
# Local database (host port 5433 -> container 5432; 5433 avoids clashing
# with a native Postgres service already running on this machine)
docker compose up -d

# Dev server
npm run dev

# Schema / migrations
npm run db:generate      # drizzle-kit generate
npm run db:migrate       # drizzle-kit migrate
npm run db:studio        # drizzle-kit studio (browse DB)

# Seed data
npm run db:seed          # runs src/db/seed.ts (idempotent, safe to rerun)

# Scrapers
npm run scrape                        # all adapters
npm run scrape -- --league=super-league
npm run scrape -- --league=gaa
npx tsx src/scrapers/gaa/index.ts --dry-run
npx tsx src/scrapers/super-league/index.ts --dry-run
```

## Implementation Checklist

Work sequentially. Commit after each sub-phase passes its verification
command (`git commit -m "feat: complete phase X.Y"`).

- **Phase 1 — Foundation & Database**
  - [x] 1.1 Project skeleton (Next.js + TS + Tailwind) & Dockerized Postgres
  - [x] 1.2 Drizzle ORM & core domain schema (sports, competitions, teams,
        venues, fixtures)
  - [x] 1.3 Governance schema (fixture_proposals, votes) & seed script
- **Phase 2 — Scraper-First Pipeline**
  - [x] 2.1 Base scraper framework & normalized types
  - [x] 2.2 UK Super League scraper adapter
  - [x] 2.3 GAA All-Ireland scraper adapter
  - [x] 2.4 Unified ingestion runner CLI (idempotent upserts)
- **Phase 3 — Public APIs & Calendar Feeds**
  - [x] 3.1 Public read-only REST API (`/api/v1/*`)
  - [x] 3.2 Dynamic iCal / webcal subscription feeds
- **Phase 4 — Mobile-First Fan Portal**
  - [x] 4.1 Layout, navigation, sport tabs, date bar
  - [x] 4.2 FixtureCard & match details
  - [x] 4.3 "Subscribe to Calendar" modal
- **Phase 5 — Crowdsourcing & Governance**
  - [x] 5.1 Auth.js authentication setup
  - [x] 5.2 Grassroots fixture submission form (locked-competition block)
  - [x] 5.3 Community verification & upvoting (+3 promotion rule)
- **Phase 6 — Production Polish & PWA**
  - [x] 6.1 PWA manifest & offline support
  - [x] 6.2 Automated ingestion cron (`/api/cron/scrape` + GitHub Actions)

See `plan.md` for full scope details and the exact Claude-Code prompt text
for each sub-phase.
