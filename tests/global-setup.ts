import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import postgres from "postgres";
import { loadEnv } from "./load-env";

/**
 * Runs once before the whole test run: creates the test database (if it
 * doesn't exist yet) on the same local Postgres container as dev, then
 * applies every migration to it. Integration tests then point DATABASE_URL
 * at this database via tests/setup.ts, never at the real dev database.
 */
export default async function globalSetup() {
  loadEnv();
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL is not set (see .env.example).");
  }

  const url = new URL(testUrl);
  const dbName = url.pathname.replace(/^\//, "");

  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres"; // Postgres' own always-present maintenance database
  const admin = postgres(adminUrl.toString(), { max: 1 });
  try {
    await admin`CREATE DATABASE ${admin(dbName)}`;
  } catch (err) {
    // 42P04 = database already exists — fine, reuse it.
    if ((err as { code?: string }).code !== "42P04") throw err;
  } finally {
    await admin.end();
  }

  const migrationClient = postgres(testUrl, { max: 1 });
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: path.resolve(__dirname, "../drizzle"),
    });
  } finally {
    await migrationClient.end();
  }
}
