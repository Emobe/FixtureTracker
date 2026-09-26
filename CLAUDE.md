# CLAUDE.md

## Project Overview

A mobile-first sports fixture and calendar platform for under-served sports:
GAA Football & Hurling, Rugby League / Super League, Roller Derby, and
grassroots club sports. Fixtures come from automated scrapers (official
leagues) and community submissions (grassroots competitions), delivered via a
public REST API (`/api/v1/*`), dynamic iCal/webcal feeds, and a Next.js PWA.

Area-specific notes live in nested CLAUDE.md files that load when you work in
those folders: `src/scrapers/`, `src/app/`, `src/components/`. Plan history,
deviations and known gaps are in `docs/ARCHITECTURE_NOTES.md`.

## Tech Stack

- Next.js 16 (App Router, Server Components, Server Actions), React 19.
  `agentRules: false` in `next.config.ts` stops `next dev` writing its own
  block into this file.
- Tailwind CSS + `lucide-react`. All components are hand-built. No shadcn/ui.
- PostgreSQL 16 (Docker Compose) + Drizzle ORM
- Auth.js v5 (`next-auth@beta`), Drizzle adapter, database sessions, GitHub OAuth
- `ical-generator` for `.ics` / `webcal://` feeds
- Scrapers: TypeScript adapters using `cheerio` + native `fetch`
- Vitest for the regression suite

## Commands

```bash
# Database (host port 5433 -> container 5432, avoids a native Postgres on 5432)
docker compose up -d

# Dev & tests
npm run dev
npm test                 # Vitest regression suite

# Schema / migrations
npm run db:generate      # drizzle-kit generate
npm run db:migrate       # drizzle-kit migrate
npm run db:studio        # drizzle-kit studio
npm run db:seed          # src/db/seed.ts, idempotent. Also seeds the unlocked
                         # roller-derby-community-league-2026 competition the
                         # submission form depends on.

# Scrapers
npm run scrape                        # all adapters
npm run scrape -- --league=super-league
npm run scrape -- --league=gaa
npx tsx src/scrapers/gaa/index.ts --dry-run
npx tsx src/scrapers/super-league/index.ts --dry-run
```

## Core Domain Model

- `sports`: id, slug, name, icon
- `competitions`: id, sportId, slug, name, season, **isLocked**,
  authorityType (`SCRAPED` | `COMMUNITY`), websiteUrl
- `teams`: id, sportId, slug, name, shortName, crestUrl, homeVenueId
- `venues`: id, name, address, city, country, latitude, longitude, timezone
- `fixtures`: id, competitionId, homeTeamId, awayTeamId, venueId,
  scheduledStartTime, status (`SCHEDULED` | `POSTPONED` | `CANCELLED` |
  `COMPLETED`), broadcastInfo, streamUrl, homeScoreDisplay, awayScoreDisplay,
  scoreData (jsonb), **trustStatus** (`OFFICIAL` | `COMMUNITY_VERIFIED` |
  `NEEDS_VERIFICATION`), submittedByUserId (null for scraped), externalRef
- `fixture_proposals`: id, fixtureId, proposedStartTime, proposedVenueId,
  reason, proofUrl, status, netVotes
- `votes`: id, targetType (`FIXTURE` | `PROPOSAL`), targetId, userId,
  direction (+1 / -1), unique on `(userId, targetType, targetId)`
- `users` / `accounts` / `sessions` / `verification_tokens`: Auth.js tables

## Governance Rules (critical, do not violate)

Who may change a fixture depends on whether its competition is locked.

- **Locked** (`isLocked = true`, `authorityType = 'SCRAPED'`, e.g. Super
  League, GAA All-Ireland): fixtures are written only by scrapers, with
  `trustStatus = 'OFFICIAL'`. Users can never create, edit or vote on them.
  They may only file a "Report Discrepancy" (reason + source URL), which
  never mutates the fixture.
- **Unlocked** (`isLocked = false`, `authorityType = 'COMMUNITY'`, e.g.
  Roller Derby, local clubs): authenticated users may submit fixtures. They
  always start at `NEEDS_VERIFICATION` and always require a proof URL.
- The submission form hard-blocks locked competitions with: "Official
  fixtures for this league are managed automatically."
- Every action that touches a fixture (submit, vote, report) re-checks
  `competition.isLocked` server-side. Never rely on the UI alone.
- A community fixture auto-promotes to `COMMUNITY_VERIFIED` at **+3 net
  votes**. One vote per user per target, enforced by the unique constraint.
- Scrapers must be idempotent: re-runs update changed fields on the existing
  row and never insert duplicates.

## Guardrails (deliberate decisions, don't undo)

- Standalone `tsx` scripts don't auto-load `.env`. Run them with
  `tsx --env-file=.env` (already wired into `db:seed` and `scrape`).
- `teams.slug` is globally unique and namespaced per sport
  (`gaa-football-cork` vs `gaa-hurling-cork`). Always pass `sportSlug` to
  `getOrCreateTeam`.
- There is no `LIVE` fixture status. "Live" is derived display-side in
  `FixtureCard`. Don't add a `LIVE` enum value.
- The Auth.js `accounts` table uses snake_case JS keys (`refresh_token`,
  `access_token`, etc.), unlike every other table. Required by
  `DefaultPostgresAccountsTable`. Don't convert to camelCase.
- A `"use server"` file may only export async functions. Shared state/types
  for actions live in `src/lib/validation/`.
- Don't use `next-themes`, and don't use `require.resolve("tsx/cli")`.
  Reasons in the nested CLAUDE.md files.
- Team crests are trademarked marks sourced from Wikipedia. Fine for local
  dev, not cleared for public deployment.