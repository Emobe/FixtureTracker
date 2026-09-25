"use client";

import { MapPin, ShieldCheck, Tv, Users } from "lucide-react";

export interface FixtureCardData {
  id: string;
  scheduledStartTime: string | Date;
  status: "SCHEDULED" | "POSTPONED" | "CANCELLED" | "COMPLETED";
  trustStatus: "OFFICIAL" | "COMMUNITY_VERIFIED" | "NEEDS_VERIFICATION";
  broadcastInfo: string | null;
  homeScoreDisplay: string | null;
  awayScoreDisplay: string | null;
  competition: { name: string };
  homeTeam: { name: string; shortName: string | null; crestUrl: string | null };
  awayTeam: { name: string; shortName: string | null; crestUrl: string | null };
  venue: { name: string; city: string | null; country: string | null } | null;
}

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;

function displayStatus(fixture: FixtureCardData): {
  label: string;
  className: string;
} {
  if (fixture.status === "POSTPONED") {
    return { label: "Postponed", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };
  }
  if (fixture.status === "CANCELLED") {
    return { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" };
  }
  if (fixture.status === "COMPLETED") {
    return { label: "Full-time", className: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" };
  }

  const start = new Date(fixture.scheduledStartTime).getTime();
  const now = Date.now();
  if (now >= start && now < start + MATCH_DURATION_MS) {
    return { label: "Live", className: "bg-red-600 text-white" };
  }
  return { label: "Scheduled", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" };
}

function TeamCrest({ team }: { team: FixtureCardData["homeTeam"] }) {
  if (team.crestUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain crest URLs; not worth configuring next/image remote patterns for a placeholder-only field right now.
    return <img src={team.crestUrl} alt="" className="h-8 w-8 rounded-full object-cover" />;
  }
  const initials = (team.shortName ?? team.name).slice(0, 2).toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
      {initials}
    </span>
  );
}

function mapUrl(venue: NonNullable<FixtureCardData["venue"]>): string {
  const query = [venue.name, venue.city, venue.country].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function FixtureCard({ fixture }: { fixture: FixtureCardData }) {
  const status = displayStatus(fixture);
  const isCompleted = fixture.status === "COMPLETED";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span className="truncate">{fixture.competition.name}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <TeamCrest team={fixture.homeTeam} />
          <span className="truncate text-sm font-medium">{fixture.homeTeam.name}</span>
        </div>

        <div className="shrink-0 px-2 text-center">
          {isCompleted ? (
            <span className="text-sm font-semibold tabular-nums">
              {fixture.homeScoreDisplay} - {fixture.awayScoreDisplay}
            </span>
          ) : (
            <span suppressHydrationWarning className="text-sm font-semibold tabular-nums">
              {new Date(fixture.scheduledStartTime).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-medium">{fixture.awayTeam.name}</span>
          <TeamCrest team={fixture.awayTeam} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
        {fixture.venue && (
          <a
            href={mapUrl(fixture.venue)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <MapPin className="h-3.5 w-3.5" />
            {fixture.venue.name}
          </a>
        )}
        {fixture.broadcastInfo && (
          <span className="flex items-center gap-1">
            <Tv className="h-3.5 w-3.5" />
            {fixture.broadcastInfo}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          {fixture.trustStatus === "OFFICIAL" ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              Official
            </>
          ) : (
            <>
              <Users className="h-3.5 w-3.5" />
              Community
            </>
          )}
        </span>
      </div>
    </div>
  );
}
