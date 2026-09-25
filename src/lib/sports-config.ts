/** Static sport list for UI filter pills — matches the rows seeded in src/db/seed.ts. */
export const SPORT_FILTERS = [
  { slug: "gaa-football", label: "GAA Football" },
  { slug: "gaa-hurling", label: "GAA Hurling" },
  { slug: "rugby-league", label: "Rugby League" },
  { slug: "roller-derby", label: "Roller Derby" },
] as const;
