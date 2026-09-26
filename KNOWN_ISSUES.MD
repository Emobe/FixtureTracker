# Known Issues

Tracked limitations, gaps, and things that need attention before this app is
more than a local dev project. See `CLAUDE.md` for implementation-level
gotchas; this file is the higher-level "what's not done / not safe yet" list.

## Needs your action before deploying

- **No deployment exists yet.** Everything — GitHub OAuth callback, the PWA
  install, the `/api/cron/scrape` endpoint — has only ever been proven on
  `localhost`. The cron GitHub Actions workflow
  (`.github/workflows/scrape.yml`) needs `CRON_SECRET` and `SCRAPE_BASE_URL`
  added as repo secrets once a real URL exists; right now it has nothing to
  hit.
- **Team/competition crests are trademarked marks**, sourced from Wikipedia's
  public API (the same images Wikipedia itself displays for identification
  purposes). Fine for a local dev project. Don't assume they're cleared for
  reuse if this is ever deployed publicly — verify licensing per team first.
- **`.env.example` isn't actually tracked by git.** The `.gitignore` pattern
  `.env*` catches it too, so a fresh clone won't see it. Low priority, but
  means the documented env var list (`AUTH_SECRET`, `AUTH_GITHUB_ID`,
  `AUTH_GITHUB_SECRET`, `CRON_SECRET`, `TEST_DATABASE_URL`) only exists in
  this repo's working copy right now, not in git history.

## Accepted limitations (by design, not bugs)

- **The homepage's day filter buckets fixtures by UTC calendar day**
  (`src/app/page.tsx`), not the viewer's local day. A fixture just after
  midnight can land on what looks like the "wrong" day in some timezones.
  Revisit only if it becomes a real complaint.
- **No sign-in prompt on the vote/report-discrepancy buttons themselves.**
  Unlike the fixture-submission modal (which has one), a signed-out user
  just sees the vote arrows and "Report" button disabled with a tooltip
  pointing at the header's sign-in button. Deliberate scope call to avoid
  threading a bound `signIn` server action through three pages into
  `FixtureCard`.
- **`BottomNav`'s "Calendar" tab is still disabled.** No global calendar
  page exists — calendar subscription is per-team/per-competition via the
  Subscribe modal instead.

## Not yet covered

- **No automated test suite on `master` yet.** One exists on the
  `add-automated-tests` branch (Vitest — unit tests for pure logic, DB
  integration tests for the governance rules) but hasn't been merged in.
- Even once merged, the test suite doesn't cover the Next.js API routes or
  Server Actions directly (`src/app/api/**/route.ts`, `src/app/actions/**`)
  — most depend on `auth()`/`headers()` request context that isn't mocked
  yet. Their underlying logic (validation schemas, `castVoteForUser`,
  `db-helpers`) is tested instead.
- **No Lighthouse PWA audit has been run.** The manifest, icons, service
  worker registration, and offline fallback were all verified manually
  (including by actually killing the dev server to simulate an outage), but
  a full installability audit in Chrome DevTools hasn't been done.

## Fixed during the session (kept here for context)

- A service worker registered once under `npm run start`, then tested by
  repeatedly killing that server to verify the offline fallback, was left
  behind in the browser and kept intercepting requests after switching back
  to `npm run dev` on the same `localhost:3000` origin — causing a false
  "you're offline" on a perfectly working dev server. Fixed:
  `ServiceWorkerRegister` now only registers in production and actively
  unregisters/clears caches otherwise, so this self-heals on next load.
- Both scraper files (`src/scrapers/gaa/index.ts`,
  `src/scrapers/super-league/index.ts`) used to call `main()`
  unconditionally at import time, which would have triggered a live network
  scrape just from importing the module (e.g. to reach their pure parsing
  functions from a test). Fixed with an `isMainModule` guard — see
  `CLAUDE.md`.
