ALTER TABLE "fixtures" ADD COLUMN "external_ref" text;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_competition_external_ref_unique" UNIQUE("competition_id","external_ref");