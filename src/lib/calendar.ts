import ical, { ICalEventStatus } from "ical-generator";
import type { fixtures } from "@/db/schema";

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

type FixtureWithRelations = typeof fixtures.$inferSelect & {
  competition: { name: string; slug: string };
  homeTeam: { name: string };
  awayTeam: { name: string };
  venue: { name: string; city: string | null; country: string | null } | null;
};

function statusFor(status: FixtureWithRelations["status"]): ICalEventStatus {
  switch (status) {
    case "CANCELLED":
      return ICalEventStatus.CANCELLED;
    case "POSTPONED":
      return ICalEventStatus.TENTATIVE;
    case "SCHEDULED":
    case "COMPLETED":
    default:
      return ICalEventStatus.CONFIRMED;
  }
}

function locationFor(venue: FixtureWithRelations["venue"]): string | undefined {
  if (!venue) return undefined;
  return [venue.name, venue.city, venue.country].filter(Boolean).join(", ");
}

function descriptionFor(fixture: FixtureWithRelations): string {
  const lines = [`Competition: ${fixture.competition.name}`];
  if (fixture.status === "COMPLETED" && fixture.homeScoreDisplay) {
    lines.push(
      `Final score: ${fixture.homeTeam.name} ${fixture.homeScoreDisplay} - ${fixture.awayScoreDisplay} ${fixture.awayTeam.name}`,
    );
  }
  if (fixture.broadcastInfo) lines.push(`Broadcast: ${fixture.broadcastInfo}`);
  if (fixture.streamUrl) lines.push(`Stream: ${fixture.streamUrl}`);
  lines.push(
    `Trust status: ${fixture.trustStatus === "OFFICIAL" ? "Official" : fixture.trustStatus === "COMMUNITY_VERIFIED" ? "Community verified" : "Needs verification"}`,
  );
  return lines.join("\n");
}

export function buildCalendar(params: {
  name: string;
  description?: string;
  fixtures: FixtureWithRelations[];
}) {
  const calendar = ical({
    name: params.name,
    description: params.description,
    prodId: { company: "Sports Fixtures", product: "Fixture Calendar" },
    ttl: 60 * 30, // suggest a 30-minute refresh to subscribing clients
  });

  for (const fixture of params.fixtures) {
    calendar.createEvent({
      id: fixture.id,
      start: fixture.scheduledStartTime,
      end: new Date(fixture.scheduledStartTime.getTime() + MATCH_DURATION_MS),
      summary: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
      location: locationFor(fixture.venue),
      description: descriptionFor(fixture),
      status: statusFor(fixture.status),
      url: fixture.streamUrl ?? undefined,
    });
  }

  return calendar;
}
