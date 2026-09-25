# Sports Fixture Service — Granular Implementation Plan for Claude Code

A specialized, mobile-first sports fixture and calendar platform built for under-served sports (GAA Football & Hurling, Rugby League / Super League, Roller Derby, and grassroots club sports). 

This plan is broken into **sequential, token-efficient sub-phases**. Run each sub-phase individually with `claude-code` to ensure stability, easy debugging, and zero hallucinated drift.

---

## Architecture & Tech Stack

```mermaid
flowchart TD
    subgraph Ingestion ["1. Data Ingestion & Scrapers"]
        SL["UK Super League Scraper"] --> Ingest["Ingestion Pipeline"]
        GAA["GAA All-Ireland Scraper"] --> Ingest
        Crowd["Community Manual Submissions (Grassroots)"] --> Ingest
    end

    subgraph Storage ["2. Database (PostgreSQL + Drizzle)"]
        Ingest --> DB[("PostgreSQL\n(Sports, Competitions, Teams, Venues, Fixtures, Votes)")]
    end

    subgraph Delivery ["3. Delivery & Outputs"]
        DB --> REST["Public REST API\n(/api/v1/fixtures)"]
        DB --> ICAL["Dynamic iCal/Webcal\n(/api/calendar/...)"]
        DB --> WEB["Next.js Web Portal\n(Mobile-First / PWA)"]
    end
```

* **Framework**: Next.js 15 (App Router, Server Components, Server Actions)
* **Styling**: Tailwind CSS + Lucide Icons + Shadcn UI primitives
* **Database & ORM**: PostgreSQL (running in Docker Compose) + Drizzle ORM
* **Auth**: Auth.js / NextAuth (OAuth & Magic Links)
* **Calendar Engine**: `ical-generator` for dynamic RFC 5545 `.ics` & `webcal://` feeds
* **Scraper Layer**: Modular Node/TypeScript scrapers using `cheerio` & native `fetch`

---

## Project Structure Overview

```text
sports-fixtures/
├── docker-compose.yml              # Local Postgres container
├── drizzle.config.ts               # Drizzle migration configuration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/                 # Public REST API (fixtures, teams, competitions)
│   │   │   └── calendar/           # Dynamic .ics / webcal endpoints
│   │   ├── (web)/                  # Public web UI routes (fixtures, teams, sports)
│   │   └── layout.tsx
│   ├── components/                 # Reusable UI components (FixtureCard, CalendarModal)
│   ├── db/
│   │   ├── index.ts                # Drizzle client instance
│   │   └── schema.ts               # Complete database schema & relationships
│   ├── lib/
│   │   ├── calendar.ts             # iCal event formatting utilities
│   │   └── timezones.ts            # Localized date-time helpers
│   └── scrapers/                   # Ingestion scripts
│       ├── base.ts                 # Base adapter interface & HTTP client
│       ├── gaa/                    # GAA All-Ireland scraper
│       ├── super-league/           # Rugby League Super League scraper
│       └── runner.ts               # CLI runner script (`npm run scrape`)
└── package.json
```

---

## Execution Guide for Claude Code

When working with `claude-code`:
1. Execute **one sub-phase at a time**.
2. Run the provided **Verification Command** before proceeding to the next sub-phase.
3. Commit git state after every successful sub-phase (`git commit -m "feat: complete phase X.Y"`).

---

# Phase 1: Foundation & Database Setup

### Sub-Phase 1.1: Project Skeleton & Dockerized PostgreSQL
* **Scope**:
  * Initialize Next.js project with TypeScript, Tailwind CSS, and ESLint.
  * Create `docker-compose.yml` for PostgreSQL 16 with a healthcheck.
  * Add `.env.example` and local `.env` configuration.
* **Verification Command**:
  ```bash
  docker compose up -d
  npm run dev
  ```
* **Claude-Code Prompt**:
  > "Set up the initial project skeleton for our sports fixture service:
  > 1. Initialize a clean Next.js 15 app with TypeScript, Tailwind CSS, App Router, and `src/` directory.
  > 2. Create a `docker-compose.yml` file running PostgreSQL 16 on port 5432 with database name `sports_fixtures`, username `postgres`, password `postgres`, and a persistent volume.
  > 3. Create `.env.example` with `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sports_fixtures`.
  > 4. Ensure `npm run dev` and `docker compose up -d` run without errors."

---

### Sub-Phase 1.2: Drizzle ORM & Core Domain Schema
* **Scope**:
  * Install `drizzle-orm`, `drizzle-kit`, and `pg` / `postgres`.
  * Define core entities in `src/db/schema.ts`:
    * `sports`: `id, slug, name, icon, createdAt`
    * `competitions`: `id, sportId, slug, name, season, isLocked (boolean), authorityType ('SCRAPED' | 'COMMUNITY'), websiteUrl`
    * `teams`: `id, sportId, slug, name, shortName, crestUrl, homeVenueId`
    * `venues`: `id, name, address, city, country, latitude, longitude, timezone`
    * `fixtures`: `id, competitionId, homeTeamId, awayTeamId, venueId, scheduledStartTime, status ('SCHEDULED' | 'POSTPONED' | 'CANCELLED' | 'COMPLETED'), broadcastInfo, streamUrl, homeScoreDisplay, awayScoreDisplay, scoreData (jsonb), trustStatus ('OFFICIAL' | 'COMMUNITY_VERIFIED' | 'NEEDS_VERIFICATION')`
  * Generate and apply initial database migrations.
* **Verification Command**:
  ```bash
  npx drizzle-kit generate
  npx drizzle-kit migrate
  ```
* **Claude-Code Prompt**:
  > "Install and configure Drizzle ORM for PostgreSQL:
  > 1. Install `drizzle-orm`, `postgres`, and dev dependencies `drizzle-kit`, `@types/pg`.
  > 2. Configure `drizzle.config.ts` and `src/db/index.ts`.
  > 3. Define the relational schema in `src/db/schema.ts` for `sports`, `competitions` (with `isLocked` flag), `teams`, `venues`, and `fixtures` (with status, localized timestamps, scoreData JSONB, and trustStatus enum).
  > 4. Run migration generation and push the schema to the running local Postgres container."

---

### Sub-Phase 1.3: Governance & Seed Data Script
* **Scope**:
  * Add governance tables to schema:
    * `fixture_proposals`: `id, fixtureId, proposedStartTime, proposedVenueId, reason, proofUrl, status, netVotes`
    * `votes`: `id, targetType ('FIXTURE' | 'PROPOSAL'), targetId, userId, direction (+1 or -1)`
  * Create `src/db/seed.ts` to populate initial sports (`GAA Football`, `GAA Hurling`, `Rugby League`, `Roller Derby`) and base venues (e.g. Croke Park, Totally Wicked Stadium).
* **Verification Command**:
  ```bash
  npx tsx src/db/seed.ts
  ```
* **Claude-Code Prompt**:
  > "Implement the governance schema and database seed script:
  > 1. Add `fixture_proposals` and `votes` tables to `src/db/schema.ts` to support our crowdsourcing and verification rules.
  > 2. Run migrations.
  > 3. Create `src/db/seed.ts` that populates sports: GAA Football, GAA Hurling, Rugby League, and Roller Derby, plus default governing bodies and 4 known venues.
  > 4. Add an `npm run db:seed` script to `package.json` and verify execution."

---

# Phase 2: Scraper-First Pipeline

### Sub-Phase 2.1: Scraper Base Framework & Types
* **Scope**:
  * Define `BaseScraper` abstract class / interface in `src/scrapers/base.ts`.
  * Standard normalized match interface: `RawFixture { homeTeam, awayTeam, competitionSlug, startTimeUTC, venueName, status, result? }`.
  * Utilities for rate-limiting, user-agent rotation, resilient HTML parsing with `cheerio`.
* **Verification Command**:
  ```bash
  npx tsx -e "import './src/scrapers/base.ts'"
  ```
* **Claude-Code Prompt**:
  > "Create the base scraper infrastructure in `src/scrapers/base.ts`:
  > 1. Install `cheerio` and define a strict TypeScript interface `ScrapedFixture` (home team, away team, start time ISO, venue, round, competition slug, status, score).
  > 2. Create an abstract `BaseScraper` class with rate-limiting, custom User-Agent headers, error logging, and standard fetch wrapper.
  > 3. Export utility functions for fuzzy matching team names against existing database records."

---

### Sub-Phase 2.2: UK Super League Scraper Adapter
* **Scope**:
  * Create `src/scrapers/super-league/index.ts` to scrape fixtures and results for the Betfred Super League.
  * Ingest round number, date, UK kickoff time, home/away teams, venue, and broadcast channel (Sky Sports / BBC / SuperLeague+).
  * Write fixtures with `isLocked = true` and `trustStatus = 'OFFICIAL'`.
* **Verification Command**:
  ```bash
  npx tsx src/scrapers/super-league/index.ts --dry-run
  ```
* **Claude-Code Prompt**:
  > "Build the Betfred Super League (Rugby League) scraper in `src/scrapers/super-league/index.ts`:
  > 1. Target the official fixture schedule to fetch upcoming and recent matches.
  > 2. Parse match date, kickoff time (handling GMT/BST properly), venue, home/away clubs, and TV broadcast details.
  > 3. Include a `--dry-run` flag that prints parsed fixtures as JSON without writing to the database.
  > 4. When run without `--dry-run`, upsert teams and fixtures into Postgres with `trustStatus = 'OFFICIAL'` and `isLocked = true`."

---

### Sub-Phase 2.3: GAA All-Ireland Scraper Adapter
* **Scope**:
  * Create `src/scrapers/gaa/index.ts` for All-Ireland Senior Football and Hurling championship fixtures.
  * Parse match details including county pairings, pitch/grounds (e.g. Semple Stadium, Croke Park), dates, and final scores (goals + points e.g. 1-14).
* **Verification Command**:
  ```bash
  npx tsx src/scrapers/gaa/index.ts --dry-run
  ```
* **Claude-Code Prompt**:
  > "Build the GAA All-Ireland Senior Football & Hurling fixture scraper in `src/scrapers/gaa/index.ts`:
  > 1. Ingest upcoming championship fixtures and completed match results.
  > 2. Support GAA scoring notation (e.g. '2-16' parsed into score display and total points in `scoreData`).
  > 3. Map county grounds/venues to our `venues` table.
  > 4. Add `--dry-run` and live upsert support."

---

### Sub-Phase 2.4: Unified Ingestion Runner CLI
* **Scope**:
  * Create `src/scrapers/runner.ts` as a unified entrypoint.
  * Support running all scrapers or targeting a single sport: `npm run scrape -- --league=super-league`.
  * Ensure idempotency (updating rescheduled times without creating duplicates).
* **Verification Command**:
  ```bash
  npm run scrape
  ```
* **Claude-Code Prompt**:
  > "Create a unified scraper CLI runner in `src/scrapers/runner.ts`:
  > 1. Support running all registered adapters or passing a specific league flag (e.g. `--league=super-league` or `--league=gaa`).
  > 2. Ensure database operations are idempotent: if a fixture kickoff time or venue changed, update the record and log the change; do not insert duplicates.
  > 3. Add an `npm run scrape` script to `package.json`."

---

# Phase 3: Public APIs & Dynamic Calendar Feeds

### Sub-Phase 3.1: Public Read-Only REST API
* **Scope**:
  * Build `/api/v1/fixtures`: query by `sport`, `competition`, `team`, `dateFrom`, `dateTo`, `status`.
  * Build `/api/v1/competitions` and `/api/v1/teams`.
  * Add in-memory or Redis-ready rate-limiting header middleware.
* **Verification Command**:
  ```bash
  curl http://localhost:3000/api/v1/fixtures?sport=rugby-league
  ```
* **Claude-Code Prompt**:
  > "Create the public REST API endpoints in Next.js App Router:
  > 1. `GET /api/v1/fixtures`: Returns paginated fixtures with filters for `sport`, `competition`, `team`, and `status`. Include nested team names, venue info, and broadcast details.
  > 2. `GET /api/v1/teams` and `GET /api/v1/competitions`.
  > 3. Add basic rate-limiting response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`).
  > 4. Ensure clean JSON output format with proper HTTP status codes."

---

### Sub-Phase 3.2: Dynamic iCal / Webcal Subscription Feeds
* **Scope**:
  * Install `ical-generator`.
  * Create dynamic route handlers:
    * `/api/calendar/team/[slug].ics`
    * `/api/calendar/competition/[slug].ics`
  * Construct standards-compliant VCALENDAR events with:
    * `SUMMARY`: e.g. "St Helens vs Wigan Warriors"
    * `LOCATION`: Venue name + full address
    * `DESCRIPTION`: Competition name, TV/stream link, trust status
    * `DTSTART` / `DTEND`: Accurate UTC timestamps
    * `STATUS`: TENTATIVE, CONFIRMED, or CANCELLED based on fixture status.
* **Verification Command**:
  ```bash
  curl http://localhost:3000/api/calendar/team/wigan-warriors.ics
  ```
* **Claude-Code Prompt**:
  > "Implement dynamic iCal (.ics) calendar subscription feeds:
  > 1. Install `ical-generator`.
  > 2. Create route handlers at `/api/calendar/team/[slug]/route.ts` and `/api/calendar/competition/[slug]/route.ts`.
  > 3. Fetch fixtures for the team/competition and generate a valid RFC 5545 iCalendar feed with `Content-Type: text/calendar; charset=utf-8` and `Cache-Control` headers.
  > 4. Map venue, kickoff times, TV channel, and match status directly into the iCal event fields."

---

# Phase 4: Mobile-First Fan Portal (UI)

### Sub-Phase 4.1: Layout, Navigation & Sport Tabs
* **Scope**:
  * Set up mobile-responsive navigation with sport category chips (All, GAA Football, GAA Hurling, Rugby League, Roller Derby).
  * Date navigation bar ("Yesterday", "Today", "This Weekend", custom date picker).
  * Dark/light mode theme support.
* **Verification Command**:
  Open browser at `http://localhost:3000` in mobile viewport (390px width).
* **Claude-Code Prompt**:
  > "Build the mobile-first layout and navigation:
  > 1. Install `lucide-react` and set up standard UI layout with header, bottom navigation bar on mobile, and sport filter pills.
  > 2. Create a horizontal scrolling Date Bar (Yesterday, Today, Tomorrow, Weekend, Date Picker).
  > 3. Optimize responsiveness for mobile viewports (clean touch targets, compact cards)."

---

### Sub-Phase 4.2: Fixture Card & Match Details
* **Scope**:
  * Create `FixtureCard` component:
    * Team crests, names, kickoff time in viewer's local timezone.
    * Venue with clickable Google Maps / Apple Maps directions link.
    * Broadcast tag (e.g. "Sky Sports", "TG4", "YouTube Live").
    * Status pill: Live, Completed (with score), Postponed, or Scheduled.
    * Trust Badge: `Official` (shield icon) or `Community` (users icon).
* **Verification Command**:
  Verify fixtures render correctly with both mock and scraped database records.
* **Claude-Code Prompt**:
  > "Create the `FixtureCard` component in `src/components/FixtureCard.tsx`:
  > 1. Display Home vs Away teams, kickoff time converted to user local timezone, and competition badge.
  > 2. Show venue details with an external map link.
  > 3. Include TV/stream channel tag and the trust status badge (`Official` vs `Community`).
  > 4. Display final score when status is `COMPLETED`."

---

### Sub-Phase 4.3: 1-Tap "Subscribe to Calendar" Modal
* **Scope**:
  * Add a "Subscribe" button on team pages and competition headers.
  * Modal with 1-click subscription links:
    * **Apple Calendar** (`webcal://...`)
    * **Google Calendar** (redirect to `google.com/calendar/render?cid=...`)
    * **Download .ics**
* **Verification Command**:
  Click "Subscribe", copy webcal URL, and test opening in calendar.
* **Claude-Code Prompt**:
  > "Build the Calendar Subscription modal component:
  > 1. Create a `SubscribeCalendarModal` with options for Apple Calendar (`webcal://`), Google Calendar (`https://calendar.google.com/calendar/render?cid=...`), Outlook, and direct `.ics` download.
  > 2. Add 'Subscribe to Team' and 'Subscribe to Competition' action buttons on the UI that trigger this modal with the corresponding endpoint URL."

---

# Phase 5: Crowdsourcing, Voting & Grassroots Governance

### Sub-Phase 5.1: Authentication Setup
* **Scope**:
  * Install and configure `next-auth` (Auth.js) with Google / GitHub OAuth or Magic Links.
  * User profile table and session management.
  * Restrict voting and manual submissions to authenticated users.
* **Verification Command**:
  Sign in via test provider or credentials in local dev.
* **Claude-Code Prompt**:
  > "Set up Auth.js (NextAuth) for user authentication:
  > 1. Install `@auth/core` and `next-auth@beta`.
  > 2. Configure authentication with GitHub / Google OAuth (or dev email provider).
  > 3. Connect Auth.js adapter to PostgreSQL via Drizzle.
  > 4. Expose auth state via clean UI sign-in/profile button in the navigation."

---

### Sub-Phase 5.2: Grassroots Fixture Submission Form
* **Scope**:
  * Create submission form for **unlocked competitions** (e.g. Roller Derby, local club tournaments).
  * Required fields: Sport, Competition (only unlocked), Home Team, Away Team, Date, Kickoff Time, Venue, and **Mandatory Proof URL** (social media announcement, club website).
  * Auto-block submissions targeting `isLocked = true` competitions (displaying friendly message: *"Official fixtures for this league are managed automatically"*).
* **Verification Command**:
  Submit a test grassroots roller derby fixture via the UI.
* **Claude-Code Prompt**:
  > "Build the community fixture submission modal and Server Action:
  > 1. Create a form with fields for Sport, Competition, Home Team, Away Team, Kickoff datetime, Venue, and Proof URL.
  > 2. Prevent selecting or submitting fixtures for locked leagues (`isLocked = true`).
  > 3. Validate form inputs with `zod`.
  > 4. Insert new fixture with `trustStatus = 'NEEDS_VERIFICATION'` and create an initial audit log entry."

---

### Sub-Phase 5.3: Community Verification & Upvoting
* **Scope**:
  * Add Upvote (+1) and Downvote (-1) buttons on community fixtures.
  * Prevent double voting using `votes` table unique constraint `(userId, targetType, targetId)`.
  * Threshold trigger: When a community fixture hits $+3$ net upvotes, automatically promote `trustStatus` from `NEEDS_VERIFICATION` to `COMMUNITY_VERIFIED`.
  * Add a **"Report Discrepancy"** button for locked fixtures with a reason and source URL.
* **Verification Command**:
  Cast 3 upvotes from test accounts and observe trust badge transition to `COMMUNITY_VERIFIED`.
* **Claude-Code Prompt**:
  > "Implement the community voting and verification logic:
  > 1. Create a Server Action for casting a vote on community fixtures (+1 or -1) with unique constraint per user.
  > 2. Auto-promote fixture `trustStatus` to `COMMUNITY_VERIFIED` when net votes reach $+3$.
  > 3. For locked fixtures, provide a 'Report Discrepancy' dialog that records a dispute ticket without modifying the official fixture time."

---

# Phase 6: Production Polish & PWA

### Sub-Phase 6.1: PWA Manifest & Mobile Offline Support
* **Scope**:
  * Add `manifest.json` and service worker for PWA installation on iOS/Android.
  * Offline view showing cached fixtures when internet is lost at grassroots pitches.
* **Verification Command**:
  Run Lighthouse audit in Chrome DevTools to verify PWA installability.
* **Claude-Code Prompt**:
  > "Configure Progressive Web App (PWA) capabilities:
  > 1. Add `manifest.json` with sports icons, theme colors, and standalone display mode.
  > 2. Add meta tags for iOS Safari mobile web app capability.
  > 3. Implement basic offline caching for recently viewed fixtures."

---

### Sub-Phase 6.2: Automated Ingestion Cron
* **Scope**:
  * Create a secure cron endpoint `/api/cron/scrape` protected by `CRON_SECRET` bearer token.
  * Provide a ready-to-use GitHub Actions workflow file (`.github/workflows/scrape.yml`) that triggers hourly scrapes.
* **Verification Command**:
  ```bash
  curl -H "Authorization: Bearer test_secret" http://localhost:3000/api/cron/scrape
  ```
* **Claude-Code Prompt**:
  > "Implement automated scheduled scraping:
  > 1. Create a protected route handler `src/app/api/cron/scrape/route.ts` requiring a `CRON_SECRET` header.
  > 2. Execute the scraper runner inside this handler and return a summary JSON response.
  > 3. Create a GitHub Actions workflow `.github/workflows/scrape.yml` configured to trigger this endpoint on a schedule."
