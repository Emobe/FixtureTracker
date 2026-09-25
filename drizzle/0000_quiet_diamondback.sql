CREATE TYPE "public"."authority_type" AS ENUM('SCRAPED', 'COMMUNITY');--> statement-breakpoint
CREATE TYPE "public"."fixture_status" AS ENUM('SCHEDULED', 'POSTPONED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."trust_status" AS ENUM('OFFICIAL', 'COMMUNITY_VERIFIED', 'NEEDS_VERIFICATION');--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sport_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"season" text,
	"is_locked" boolean DEFAULT false NOT NULL,
	"authority_type" "authority_type" DEFAULT 'COMMUNITY' NOT NULL,
	"website_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"venue_id" uuid,
	"scheduled_start_time" timestamp with time zone NOT NULL,
	"status" "fixture_status" DEFAULT 'SCHEDULED' NOT NULL,
	"broadcast_info" text,
	"stream_url" text,
	"home_score_display" text,
	"away_score_display" text,
	"score_data" jsonb,
	"trust_status" "trust_status" DEFAULT 'NEEDS_VERIFICATION' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sports_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sport_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"crest_url" text,
	"home_venue_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"country" text,
	"latitude" double precision,
	"longitude" double precision,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_home_venue_id_venues_id_fk" FOREIGN KEY ("home_venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;