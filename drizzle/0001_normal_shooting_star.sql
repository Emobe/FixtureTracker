CREATE TYPE "public"."proposal_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."vote_target_type" AS ENUM('FIXTURE', 'PROPOSAL');--> statement-breakpoint
CREATE TABLE "fixture_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" uuid NOT NULL,
	"proposed_start_time" timestamp with time zone,
	"proposed_venue_id" uuid,
	"reason" text NOT NULL,
	"proof_url" text NOT NULL,
	"status" "proposal_status" DEFAULT 'PENDING' NOT NULL,
	"net_votes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "vote_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"direction" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_user_target_unique" UNIQUE("user_id","target_type","target_id"),
	CONSTRAINT "votes_direction_check" CHECK ("votes"."direction" in (1, -1))
);
--> statement-breakpoint
ALTER TABLE "fixture_proposals" ADD CONSTRAINT "fixture_proposals_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_proposals" ADD CONSTRAINT "fixture_proposals_proposed_venue_id_venues_id_fk" FOREIGN KEY ("proposed_venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;