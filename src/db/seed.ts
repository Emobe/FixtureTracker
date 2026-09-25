import { db } from "./index";
import { sports, venues } from "./schema";

async function seed() {
  console.log("Seeding sports...");
  const insertedSports = await db
    .insert(sports)
    .values([
      { slug: "gaa-football", name: "GAA Football", icon: "shield" },
      { slug: "gaa-hurling", name: "GAA Hurling", icon: "swords" },
      { slug: "rugby-league", name: "Rugby League", icon: "trophy" },
      { slug: "roller-derby", name: "Roller Derby", icon: "circle-dot" },
    ])
    .onConflictDoNothing({ target: sports.slug })
    .returning();
  console.log(`  inserted ${insertedSports.length} sport(s)`);

  console.log("Seeding venues...");
  const insertedVenues = await db
    .insert(venues)
    .values([
      {
        name: "Croke Park",
        address: "Jones's Rd",
        city: "Dublin",
        country: "Ireland",
        latitude: 53.3607,
        longitude: -6.2512,
        timezone: "Europe/Dublin",
      },
      {
        name: "Totally Wicked Stadium",
        address: "Peter St",
        city: "St Helens",
        country: "England",
        latitude: 53.4527,
        longitude: -2.7357,
        timezone: "Europe/London",
      },
      {
        name: "Headingley Stadium",
        address: "St Michael's Ln",
        city: "Leeds",
        country: "England",
        latitude: 53.8175,
        longitude: -1.5824,
        timezone: "Europe/London",
      },
      {
        name: "Semple Stadium",
        address: "Grove Island",
        city: "Thurles",
        country: "Ireland",
        latitude: 52.6829,
        longitude: -7.7962,
        timezone: "Europe/Dublin",
      },
    ])
    .onConflictDoNothing({ target: venues.name })
    .returning();
  console.log(`  inserted ${insertedVenues.length} venue(s)`);

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
