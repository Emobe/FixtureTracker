import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export interface Adapter {
  key: string;
  label: string;
  entry: string;
}

// Paths are built from process.cwd() rather than __dirname: this module is
// imported both by the plain tsx-run CLI (src/scrapers/runner.ts, where
// __dirname is the real source directory) and by the cron API route, which
// Next/Turbopack bundles into a chunk file living under .next/server/ —
// __dirname there points at that bundle location, not the source tree.
// process.cwd() is the project root in both cases (npm scripts and
// `next start` are both invoked from there).
const PROJECT_ROOT = process.cwd();

export const ADAPTERS: Adapter[] = [
  {
    key: "super-league",
    label: "Betfred Super League (Rugby League)",
    entry: path.join(PROJECT_ROOT, "src", "scrapers", "super-league", "index.ts"),
  },
  {
    key: "gaa",
    label: "GAA All-Ireland Senior Championship (Football & Hurling)",
    entry: path.join(PROJECT_ROOT, "src", "scrapers", "gaa", "index.ts"),
  },
];

export interface RunAdapterResult {
  key: string;
  label: string;
  exitCode: number;
  output: string;
}

/**
 * Path to tsx's own CLI entry, found by walking node_modules directly
 * instead of `require.resolve("tsx/cli")`. Both Turbopack's build-time
 * tracer and its runtime require shim choke on that (the former tries to
 * inline tsx's internals, including its esbuild binary, into the cron
 * route's bundle; the latter rejects any non-literal specifier as "too
 * dynamic") — see CLAUDE.md. We only need the file path to spawn as a
 * subprocess, never to load it as a module here, so plain path lookup
 * sidesteps both problems.
 */
function resolveTsxCli(): string {
  let dir = PROJECT_ROOT;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, "node_modules", "tsx", "dist", "cli.mjs");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not find tsx/dist/cli.mjs under any parent node_modules");
}

/**
 * Runs one scraper adapter as a child `tsx` process — same as the CLI
 * runner — so a crash or `process.exit()` in one adapter can't affect the
 * caller. With `capture: true`, stdout/stderr are collected and returned
 * instead of streamed to the parent's own terminal, for building a JSON
 * summary (the cron route); the CLI runner keeps the default (inherited)
 * streaming output for interactive use.
 */
export function runAdapter(
  adapter: Adapter,
  extraArgs: string[],
  options: { capture?: boolean } = {},
): Promise<RunAdapterResult> {
  return new Promise((resolve) => {
    const chunks: string[] = [];
    const child = spawn(
      process.execPath,
      [resolveTsxCli(), "--env-file=.env", adapter.entry, ...extraArgs],
      { stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit" },
    );

    if (options.capture) {
      child.stdout?.on("data", (d: Buffer) => chunks.push(d.toString()));
      child.stderr?.on("data", (d: Buffer) => chunks.push(d.toString()));
    }

    child.on("exit", (code) => {
      resolve({ key: adapter.key, label: adapter.label, exitCode: code ?? 1, output: chunks.join("") });
    });
    child.on("error", (err) => {
      resolve({
        key: adapter.key,
        label: adapter.label,
        exitCode: 1,
        output: `[runner] failed to start ${adapter.key}: ${err}`,
      });
    });
  });
}
