# Architecture Notes

`plan.md` is the original phased plan. All six phases are complete. This file
records where the build differs from it, so a future session doesn't "fix"
deliberate calls back to the letter of the plan, or mistake real gaps for
intentional ones.

Technical detail for each area lives in the nested CLAUDE.md files:
`src/scrapers/`, `src/app/`, `src/components/`.

## Deliberate changes

- **Next.js 16, not 15.** Requested. `agentRules: false` in `next.config.ts`
  was added because of the version bump.
- **No shadcn/ui.** Everything hand-built with Tailwind + `lucide-react`. No
  `components.json`, no `src/components/ui/`.
- **No `src/app/(web)/` route group.** Public pages live directly under
  `src/app/`.
- **Visual redesign** (slate/zinc dark mode, custom accent, colour-hash
  monograms, monospace times and scores) went beyond Phase 4's generic
  mobile-first direction. A later, user-driven design pass.
- **Added after all phases were complete:** `/teams` and `/competitions` list
  pages, global search (`/api/search`), Wikipedia team crests, and the Vitest
  suite. The plan only had manual verification commands per phase, which
  weren't sustainable for regression checking.
- **`/teams/[slug]` and `/competitions/[slug]`** were added in 4.3 without
  their own sub-phase, because the Subscribe button needed somewhere to live.
- **`fixture_proposals` reused as the audit log** for the initial community
  submission (5.2). The plan asked for an audit log entry but never defined an
  audit-log table.
- **Seed creates a Roller Derby competition** (added in 5.2). The plan's 1.3
  seed only covered sports and venues, which left the submission form with
  nothing unlocked to submit into.
- **Super League source is Wikipedia**, not the official site, which blocks
  non-browser clients.

## Real gaps (not deliberate)

- **Broadcast info is never populated.** Plan 2.2 and 4.2 assume scraped
  fixtures carry a broadcaster. Neither scraper sets `broadcastInfo`, and the
  submission form doesn't expose the field. The card tag and calendar feed
  line are wired and correct but have no data.
- **Fuzzy team matching (2.1) is dead code.** `src/scrapers/match-teams.ts`
  exists but nothing calls it; `getOrCreateTeam` uses exact slug matching.
- **Outlook was missing from the 4.3 Subscribe modal** (the prompt listed it,
  the scope bullets didn't). Fixed during the redesign pass.

## Open items

- Crest licensing needs checking per team before any public deployment.
- No deployment target exists yet, so the GitHub Actions scrape workflow has
  nothing to call.
- Homepage day filter uses UTC days, not the viewer's local day.