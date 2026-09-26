import { loadEnv } from "./load-env";

loadEnv();

// Anything importing "@/db" in a test must get the test database, never the
// real dev one. This runs before each test file's own imports resolve.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
