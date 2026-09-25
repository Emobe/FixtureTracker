"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { competitions, fixtureProposals, fixtures, sports } from "@/db/schema";
import {
  fixtureSubmissionSchema,
  type SubmitFixtureState,
} from "@/lib/validation/fixture-submission";
import { getOrCreateTeam, getOrCreateVenue } from "@/scrapers/db-helpers";

export async function submitFixtureAction(
  _prevState: SubmitFixtureState,
  formData: FormData,
): Promise<SubmitFixtureState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Sign in to submit a fixture." };
  }

  const parsed = fixtureSubmissionSchema.safeParse({
    competitionId: formData.get("competitionId"),
    homeTeamName: formData.get("homeTeamName"),
    awayTeamName: formData.get("awayTeamName"),
    date: formData.get("date"),
    time: formData.get("time"),
    venueName: formData.get("venueName"),
    proofUrl: formData.get("proofUrl"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.id, data.competitionId),
  });
  if (!competition) {
    return { status: "error", message: "That competition no longer exists." };
  }
  // Defense in depth: the picker only ever lists unlocked competitions, but
  // a tampered request could still target a locked one directly.
  if (competition.isLocked) {
    return {
      status: "error",
      message: "Official fixtures for this league are managed automatically.",
    };
  }

  const scheduledStartTime = new Date(`${data.date}T${data.time}`);
  if (Number.isNaN(scheduledStartTime.getTime())) {
    return {
      status: "error",
      message: "Enter a valid date and time.",
      fieldErrors: { date: "Enter a valid date and time." },
    };
  }

  const sport = await db.query.sports.findFirst({
    where: eq(sports.id, competition.sportId),
  });
  if (!sport) {
    return { status: "error", message: "Unknown sport for this competition." };
  }

  const [homeTeam, awayTeam, venue] = await Promise.all([
    getOrCreateTeam({ sportId: sport.id, sportSlug: sport.slug, name: data.homeTeamName }),
    getOrCreateTeam({ sportId: sport.id, sportSlug: sport.slug, name: data.awayTeamName }),
    getOrCreateVenue(data.venueName),
  ]);

  const [fixture] = await db
    .insert(fixtures)
    .values({
      competitionId: competition.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      venueId: venue.id,
      scheduledStartTime,
      status: "SCHEDULED",
      trustStatus: "NEEDS_VERIFICATION",
      submittedByUserId: session.user.id,
    })
    .returning();

  // Audit trail for the initial submission (proof + reason). Reuses
  // fixture_proposals rather than adding a separate audit-log table — see
  // CLAUDE.md.
  await db.insert(fixtureProposals).values({
    fixtureId: fixture.id,
    proposedStartTime: scheduledStartTime,
    proposedVenueId: venue.id,
    reason: "Initial community submission",
    proofUrl: data.proofUrl,
    status: "ACCEPTED",
  });

  revalidatePath("/");
  return { status: "success", message: "Fixture submitted for verification." };
}
