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
  `NEEDS_VERIFICATION`)
- `fixture_proposals` — id, fixtureId, proposedStartTime, proposedVenueId,
  reason, proofUrl, status, netVotes
- `votes` — id, targetType (`FIXTURE` | `PROPOSAL`), targetId, userId,
  direction (+1 / -1), unique on `(userId, targetType, targetId)`

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

## Standard Commands

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
  - [ ] 4.3 "Subscribe to Calendar" modal
- **Phase 5 — Crowdsourcing & Governance**
  - [ ] 5.1 Auth.js authentication setup
  - [ ] 5.2 Grassroots fixture submission form (locked-competition block)
  - [ ] 5.3 Community verification & upvoting (+3 promotion rule)
- **Phase 6 — Production Polish & PWA**
  - [ ] 6.1 PWA manifest & offline support
  - [ ] 6.2 Automated ingestion cron (`/api/cron/scrape` + GitHub Actions)

See `plan.md` for full scope details and the exact Claude-Code prompt text
for each sub-phase.
