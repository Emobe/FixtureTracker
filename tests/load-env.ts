import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Minimal .env loader for test setup files, which run outside Next.js's own
 * automatic .env loading. Doesn't overwrite variables already set in the
 * environment (e.g. by a CI runner).
 */
export function loadEnv(): void {
  const envPath = path.resolve(__dirname, "../.env");
  let content: string;
  try {
    content = readFileSync(envPath, "utf-8");
  } catch {
    return; // no .env file — rely on whatever the environment already provides
  }

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
