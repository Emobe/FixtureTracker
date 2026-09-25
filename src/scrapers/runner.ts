/**
 * Unified entrypoint for running scraper adapters.
 *
 *   npm run scrape                        # all adapters
 *   npm run scrape -- --league=super-league
 *   npm run scrape -- --league=gaa
 *   npm run scrape -- --dry-run           # forwarded to each adapter
 *
 * See run-adapters.ts for the shared adapter list and child-process
 * runner also used by the cron route (src/app/api/cron/scrape/route.ts).
 */
import { ADAPTERS, runAdapter } from "./run-adapters";

async function main() {
  const args = process.argv.slice(2);
  const leagueArg = args.find((a) => a.startsWith("--league="));
  const requestedLeague = leagueArg?.split("=")[1];
  const passthroughArgs = args.filter((a) => !a.startsWith("--league="));

  const adapters = requestedLeague
    ? ADAPTERS.filter((a) => a.key === requestedLeague)
    : ADAPTERS;

  if (requestedLeague && adapters.length === 0) {
    console.error(
      `[runner] unknown --league="${requestedLeague}". Known leagues: ${ADAPTERS.map((a) => a.key).join(", ")}`,
    );
    process.exit(1);
  }

  let exitCode = 0;
  for (const adapter of adapters) {
    console.log(`\n=== ${adapter.label} ===`);
    const result = await runAdapter(adapter, passthroughArgs);
    if (result.exitCode !== 0) {
      console.error(`[runner] ${adapter.key} exited with code ${result.exitCode}`);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}

main();
