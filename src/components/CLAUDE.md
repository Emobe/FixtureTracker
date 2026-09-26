# Components

All hand-built with Tailwind + `lucide-react`. No shadcn/ui.

## Design system

- Deep slate/zinc dark mode with one custom accent (`--accent` in
  `src/app/globals.css`, exposed via `@theme inline` as `bg-accent`,
  `text-accent`, etc). Not stock Tailwind emerald/green.
- `--surface` / `--border` tokens for cards.
- Kickoff times and scores use `font-mono`. Everything else is Geist Sans.
- Teams without a `crestUrl` render a monogram coloured by a deterministic
  hash of the team name (`nameHue` in `FixtureCard.tsx`), so a team gets the
  same colour everywhere.

## Theme

- **Don't use `next-themes`.** Its `ThemeProvider` renders a `<script>` from a
  client component, which triggers a React 19 dev warning on this Next
  16.3.6 / React 19.2.8 combo.
- `ThemeToggle` must render the default (light) icon on first render and
  correct from real DOM state in a mount effect. The earlier version read the
  DOM in a `useState` lazy initializer, which caused a real hydration mismatch
  (React error #418, reproduced in a production build). Don't reintroduce it.

## FixtureCard

- "Live" pill is derived in `displayStatus`: a `SCHEDULED` fixture whose
  kickoff has passed but is within the ~2h match window. Not a DB status.
- Vote widget (▲ count ▼) shows only for non-`OFFICIAL` fixtures, and the
  Report button only for `OFFICIAL` ones. Pure `trustStatus` check, no join
  needed, since only scraped fixtures are ever `OFFICIAL`.
- Signed-out users see vote/report disabled with a tooltip pointing to the
  header's sign-in. No inline sign-in prompt, a deliberate scope call to
  avoid threading a bound `signIn` action through three pages. Revisit only
  if it becomes a UX complaint.
- Broadcast tag is fully wired but scraped fixtures never have
  `broadcastInfo`, so it rarely shows.
- Team and competition names link to `/teams/[slug]` and
  `/competitions/[slug]`.

## Other components

- `SubscribeCalendarModal.tsx`: Apple Calendar, Google Calendar, Outlook
  (same `webcal://` URL as Apple) and direct `.ics` download.
- `SearchOverlay.tsx`: debounced 250ms, 2+ characters, hits `/api/search`.
- `BrowseTabs.tsx`: segmented control between `/teams` and `/competitions`.
- `SportFilterPills`: generic over the current pathname.
- `BottomNav.tsx`: the "Teams" tab is active for both `/teams` and
  `/competitions` via a special case in `isActive`. Don't simplify it to
  `pathname === item.href`.
- `AuthButton.tsx`: Server Component with inline Server Actions for
  sign-in/sign-out, rendered from `Header.tsx`.
- `SubmitFixtureButton` / `SubmitFixtureModal`: floating "+" in
  `src/app/layout.tsx`. The modal does include a sign-in prompt.

## Service worker (`ServiceWorkerRegister.tsx` + `public/sw.js`)

- Hand-rolled, not `next-pwa` (no clean Turbopack story).
- Network-first for navigations and API/RSC requests, falling back to the
  last cached response or `/offline`. Cache-first for hashed `/_next/static/`.
- **Registers only when `NODE_ENV === "production"`.** Otherwise it
  unregisters and clears caches. This fixed a real bug: a worker registered
  under `npm run start` on `localhost:3000` kept serving `/offline` after
  switching to `npm run dev` on the same origin. If a false "you're offline"
  appears again, suspect a stale registration from testing under
  `next start`.