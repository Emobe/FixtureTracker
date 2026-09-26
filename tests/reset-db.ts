import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Truncates every app table between integration tests so they don't leak state into each other. */
export async function resetDatabase(): Promise<void> {
  await db.execute(sql`
    TRUNCATE TABLE
      votes, fixture_proposals, fixtures, teams, venues, competitions, sports,
      sessions, accounts, verification_tokens, users
    RESTART IDENTITY CASCADE
  `);
}
