# App routes, actions, auth, PWA

## Routes

- Public pages live directly under `src/app/`. There is no `(web)` route group.
- `/teams/[slug]` and `/competitions/[slug]`: minimal Server Components
  (header + Subscribe button + fixtures via `FixtureCard`).
- `/teams` and `/competitions` list pages: grouped by sport, filtered with
  `SportFilterPills`, switched via `BrowseTabs`. Both keep `?sport=` across
  the switch.
- Homepage day filter (`page.tsx`) buckets by UTC calendar day
  (`[00:00, 24:00)` UTC), not the viewer's local day. Known and accepted;
  revisit only if it becomes a real complaint.
- Calendar routes (`api/calendar/team/[slug]/route.ts`,
  `api/calendar/competition/[slug]/route.ts`) accept the slug with or without
  `.ics`. The segment captures it literally, so the handler strips `.ics`
  before the DB lookup.
- `GET /api/search?q=` does an `ilike` name match on `teams` and
  `competitions` (top 8 each). It backs `SearchOverlay` only and is not part
  of the public `/api/v1/*` contract (no pagination, no sport filter).

## Auth.js (`src/auth.ts`)

- `next-auth@beta` (v5), `@auth/drizzle-adapter`, database sessions (not JWT),
  GitHub as the only provider.
- Needs `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` from a GitHub OAuth App
  (Homepage `http://localhost:3000`, Callback
  `http://localhost:3000/api/auth/callback/github`). Without them the Sign in
  button renders but the handshake fails.
- `trustHost: true` because local dev runs on whatever port is free.
- `session.user.id` comes from a `session` callback in `src/auth.ts` plus the
  module augmentation in `src/types/next-auth.d.ts`.
- Route handler: `api/auth/[...nextauth]/route.ts`.

## Fixture submission

- Server Action `actions/submit-fixture.ts`, validated with zod in
  `src/lib/validation/fixture-submission.ts`.
- The competition picker only lists unlocked competitions, and the action
  re-checks `isLocked` server-side, returning: "Official fixtures for this
  league are managed automatically."
- Teams and venue are free text, resolved with the scrapers'
  `getOrCreateTeam` / `getOrCreateVenue`. Reused deliberately, don't duplicate.
- New fixtures get `trustStatus = 'NEEDS_VERIFICATION'`.
- No audit-log table exists. The proof URL and reason for the *initial*
  submission are stored as a `fixture_proposals` row with
  `status = 'ACCEPTED'`.
- `SubmitFixtureState` / `initialSubmitFixtureState` live in the validation
  file because a `"use server"` file can only export async functions. Don't
  move them back.

## Voting and discrepancy reports

- No stored vote counter on `fixtures`. Net votes are computed with
  `sum(direction)` in `src/lib/votes.ts` (`getVoteInfoForFixtures` for batch
  reads). `fixture_proposals.netVotes` exists but this flow doesn't use it.
- `castVoteForUser` (plain async function in `votes.ts`) holds the write path
  and the +3 promotion check. `actions/vote.ts` (`castVoteAction`) is a thin
  wrapper that resolves `session.user.id` and delegates. The split lets tests
  simulate multiple users without real sessions. Keep using
  `castVoteForUser`, don't re-derive the logic.
- Same direction twice toggles the vote off; opposite direction flips it.
- `actions/report-discrepancy.ts` and the vote action both re-check
  `isLocked` server-side.

## PWA

- `manifest.ts` uses Next's file convention (served at
  `/manifest.webmanifest`, link auto-injected). Don't also set
  `metadata.manifest`, it produced a duplicate/wrong link.
- iOS install support comes from `metadata.appleWebApp` in `layout.tsx`.
  Next 16 emits `mobile-web-app-capable`, not the deprecated
  `apple-mobile-web-app-capable`. Correct, not a regression.
- Icons in `public/` were rasterized once from `public/icon.svg` with `sharp`
  (transitive dependency, not in `package.json`). No build step regenerates
  them.
- `offline/page.tsx` is precached on service worker install. Service worker
  details are in `src/components/CLAUDE.md`.

## Theme script

- `layout.tsx` loads the pre-hydration theme script (`src/lib/theme-script.ts`)
  via `next/script` to avoid a theme flash. It triggers a React 19 dev-only
  console warning about script tags. Cosmetic, absent in production builds.

## Cron (`api/cron/scrape/route.ts`)

- Protected only by the `CRON_SECRET` bearer token check. No other access
  control.
- Calls `runAdapter` from `src/scrapers/run-adapters.ts`. Bundling gotchas
  are in `src/scrapers/CLAUDE.md`.
- The scheduled trigger is manual setup: `.github/workflows/scrape.yml` needs
  `CRON_SECRET` and `SCRAPE_BASE_URL` as repo secrets. No deployment exists
  yet, so there's nothing for the workflow to hit.
- Local check:
  `curl -H "Authorization: Bearer test_secret" http://localhost:3000/api/cron/scrape`