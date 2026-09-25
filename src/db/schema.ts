import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const authorityTypeEnum = pgEnum("authority_type", [
  "SCRAPED",
  "COMMUNITY",
]);

export const fixtureStatusEnum = pgEnum("fixture_status", [
  "SCHEDULED",
  "POSTPONED",
  "CANCELLED",
  "COMPLETED",
]);

export const trustStatusEnum = pgEnum("trust_status", [
  "OFFICIAL",
  "COMMUNITY_VERIFIED",
  "NEEDS_VERIFICATION",
]);

export const sports = pgTable("sports", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const competitions = pgTable("competitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sportId: uuid("sport_id")
    .notNull()
    .references(() => sports.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  season: text("season"),
  isLocked: boolean("is_locked").notNull().default(false),
  authorityType: authorityTypeEnum("authority_type")
    .notNull()
    .default("COMMUNITY"),
  websiteUrl: text("website_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  sportId: uuid("sport_id")
    .notNull()
    .references(() => sports.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  crestUrl: text("crest_url"),
  homeVenueId: uuid("home_venue_id").references(() => venues.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const fixtures = pgTable("fixtures", {
  id: uuid("id").primaryKey().defaultRandom(),
  competitionId: uuid("competition_id")
    .notNull()
    .references(() => competitions.id, { onDelete: "cascade" }),
  homeTeamId: uuid("home_team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  awayTeamId: uuid("away_team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  venueId: uuid("venue_id").references(() => venues.id, {
    onDelete: "set null",
  }),
  scheduledStartTime: timestamp("scheduled_start_time", {
    withTimezone: true,
  }).notNull(),
  status: fixtureStatusEnum("status").notNull().default("SCHEDULED"),
  broadcastInfo: text("broadcast_info"),
  streamUrl: text("stream_url"),
  homeScoreDisplay: text("home_score_display"),
  awayScoreDisplay: text("away_score_display"),
  scoreData: jsonb("score_data"),
  trustStatus: trustStatusEnum("trust_status")
    .notNull()
    .default("NEEDS_VERIFICATION"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sportsRelations = relations(sports, ({ many }) => ({
  competitions: many(competitions),
  teams: many(teams),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  teams: many(teams),
  fixtures: many(fixtures),
}));

export const competitionsRelations = relations(
  competitions,
  ({ one, many }) => ({
    sport: one(sports, {
      fields: [competitions.sportId],
      references: [sports.id],
    }),
    fixtures: many(fixtures),
  }),
);

export const teamsRelations = relations(teams, ({ one, many }) => ({
  sport: one(sports, {
    fields: [teams.sportId],
    references: [sports.id],
  }),
  homeVenue: one(venues, {
    fields: [teams.homeVenueId],
    references: [venues.id],
  }),
  homeFixtures: many(fixtures, { relationName: "homeTeamFixtures" }),
  awayFixtures: many(fixtures, { relationName: "awayTeamFixtures" }),
}));

export const fixturesRelations = relations(fixtures, ({ one }) => ({
  competition: one(competitions, {
    fields: [fixtures.competitionId],
    references: [competitions.id],
  }),
  homeTeam: one(teams, {
    fields: [fixtures.homeTeamId],
    references: [teams.id],
    relationName: "homeTeamFixtures",
  }),
  awayTeam: one(teams, {
    fields: [fixtures.awayTeamId],
    references: [teams.id],
    relationName: "awayTeamFixtures",
  }),
  venue: one(venues, {
    fields: [fixtures.venueId],
    references: [venues.id],
  }),
}));
