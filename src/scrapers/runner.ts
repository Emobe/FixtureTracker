/**
 * Unified entrypoint for running scraper adapters.
 *
 *   npm run scrape                        # all adapters
 *   npm run scrape -- --league=super-league
 *   npm run scrape -- --league=gaa
 *   npm run scrape -- --dry-run           # forwarded to each adapter
 */
import { spawn } from "node:child_process";
import path from "node:path";

interface Adapter {
  key: string;
  label: string;
  entry: string;
}

const ADAPTERS: Adapter[] = [
  {
    key: "super-league",
    label: "Betfred Super League (Rugby League)",
    entry: path.join(__dirname, "super-league", "index.ts"),
  },
  {
    key: "gaa",
    label: "GAA All-Ireland Senior Championship (Football & Hurling)",
    entry: path.join(__dirname, "gaa", "index.ts"),
  },
];

function runAdapter(adapter: Adapter, extraArgs: string[]): Promise<number> {
  return new Promise((resolve) => {
    console.log(`\n=== ${adapter.label} ===`);
    const child = spawn(
      process.execPath,
      [
        require.resolve("tsx/cli"),
        "--env-file=.env",
        adapter.entry,
        ...extraArgs,
      ],
      { stdio: "inherit" },
    );
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      console.error(`[runner] failed to start ${adapter.key}:`, err);
      resolve(1);
    });
  });
}

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
    const code = await runAdapter(adapter, passthroughArgs);
    if (code !== 0) {
      console.error(`[runner] ${adapter.key} exited with code ${code}`);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}

main();
