"use client";

import { ChevronDown, ChevronUp, MapPin, ShieldCheck, Tv, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useTransition } from "react";
import { castVoteAction } from "@/app/actions/vote";
import { ReportDiscrepancyModal } from "./ReportDiscrepancyModal";

export interface FixtureCardData {
  id: string;
  scheduledStartTime: string | Date;
  status: "SCHEDULED" | "POSTPONED" | "CANCELLED" | "COMPLETED";
  trustStatus: "OFFICIAL" | "COMMUNITY_VERIFIED" | "NEEDS_VERIFICATION";
  broadcastInfo: string | null;
  homeScoreDisplay: string | null;
  awayScoreDisplay: string | null;
  competition: { slug: string; name: string };
  homeTeam: { slug: string; name: string; shortName: string | null; crestUrl: string | null };
  awayTeam: { slug: string; name: string; shortName: string | null; crestUrl: string | null };
  venue: { name: string; city: string | null; country: string | null } | null;
}

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;

function displayStatus(fixture: FixtureCardData): {
  label: string;
  className: string;
  dot?: boolean;
} {
  if (fixture.status === "POSTPONED") {
    return { label: "Postponed", className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400" };
  }
  if (fixture.status === "CANCELLED") {
    return { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" };
  }
  if (fixture.status === "COMPLETED") {
    return { label: "Full-time", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" };
  }

  const start = new Date(fixture.scheduledStartTime).getTime();
  const now = Date.now();
  if (now >= start && now < start + MATCH_DURATION_MS) {
    return { label: "Live", className: "bg-red-600 text-white", dot: true };
  }
  return { label: "Upcoming", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400" };
}

/** Deterministic hue from a team name, so the same team always gets the same monogram color. */
function nameHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return hash;
}

function TeamCrest({ team }: { team: FixtureCardData["homeTeam"] }) {
  if (team.crestUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain crest URLs; not worth configuring next/image remote patterns for a placeholder-only field right now.
    return <img src={team.crestUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  }
  const initials = (team.shortName ?? team.name).slice(0, 2).toUpperCase();
  const style = { "--team-h": nameHue(team.name) } as CSSProperties;
  return (
    <span
      style={style}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--team-h)_65%_92%)] text-xs font-semibold text-[hsl(var(--team-h)_55%_32%)] dark:bg-[hsl(var(--team-h)_35%_20%)] dark:text-[hsl(var(--team-h)_60%_75%)]"
    >
      {initials}
    </span>
  );
}

function mapUrl(venue: NonNullable<FixtureCardData["venue"]>): string {
  const query = [venue.name, venue.city, venue.country].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function KickoffTime({ time }: { time: string | Date }) {
  const date = new Date(time);
  const clock = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const tzParts = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(date);
  const tz = tzParts.find((p) => p.type === "timeZoneName")?.value ?? "";
  return (
    <span suppressHydrationWarning className="flex flex-col items-center">
      <span className="font-mono text-base font-semibold tabular-nums">{clock}</span>
      <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">{tz}</span>
    </span>
  );
}

function VoteWidget({
  fixtureId,
  netVotes,
  userVote,
  canInteract,
}: {
  fixtureId: string;
  netVotes: number;
  userVote: 1 | -1 | null;
  canInteract: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function vote(direction: 1 | -1) {
    if (!canInteract || isPending) return;
    startTransition(async () => {
      await castVoteAction(fixtureId, direction);
      router.refresh();
    });
  }

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => vote(1)}
        disabled={!canInteract}
        title={canInteract ? "Upvote" : "Sign in from the header to vote"}
        className={`tap-active rounded-full p-0.5 transition-colors disabled:opacity-40 ${
          userVote === 1 ? "text-accent" : "text-zinc-400 hover:text-accent dark:text-zinc-500"
        }`}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[1ch] text-center font-mono tabular-nums">{netVotes}</span>
      <button
        type="button"
        onClick={() => vote(-1)}
        disabled={!canInteract}
        title={canInteract ? "Downvote" : "Sign in from the header to vote"}
        className={`tap-active rounded-full p-0.5 transition-colors disabled:opacity-40 ${
          userVote === -1 ? "text-red-500" : "text-zinc-400 hover:text-red-500 dark:text-zinc-500"
        }`}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export function FixtureCard({
  fixture,
  netVotes = 0,
  userVote = null,
  canInteract = false,
}: {
  fixture: FixtureCardData;
  netVotes?: number;
  userVote?: 1 | -1 | null;
  canInteract?: boolean;
}) {
  const status = displayStatus(fixture);
  const isCompleted = fixture.status === "COMPLETED";

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 transition-colors">
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Link href={`/competitions/${fixture.competition.slug}`} className="truncate hover:text-accent">
          {fixture.competition.name}
        </Link>
        <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${status.className}`}>
          {status.dot && <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />}
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link href={`/teams/${fixture.homeTeam.slug}`} className="flex flex-1 items-center gap-2.5 overflow-hidden">
          <TeamCrest team={fixture.homeTeam} />
          <span className="truncate text-[15px] font-semibold tracking-tight">{fixture.homeTeam.name}</span>
        </Link>

        <div className="shrink-0 px-1 text-center">
          {isCompleted ? (
            <span className="font-mono text-lg font-bold tabular-nums">
              {fixture.homeScoreDisplay} – {fixture.awayScoreDisplay}
            </span>
          ) : (
            <KickoffTime time={fixture.scheduledStartTime} />
          )}
        </div>

        <Link href={`/teams/${fixture.awayTeam.slug}`} className="flex flex-1 items-center justify-end gap-2.5 overflow-hidden">
          <span className="truncate text-right text-[15px] font-semibold tracking-tight">{fixture.awayTeam.name}</span>
          <TeamCrest team={fixture.awayTeam} />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-zinc-500 dark:text-zinc-400">
        {fixture.venue && (
          <a
            href={mapUrl(fixture.venue)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-accent"
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
        <span className="ml-auto flex items-center gap-3">
          {fixture.trustStatus === "OFFICIAL" ? (
            <ReportDiscrepancyModal fixtureId={fixture.id} canInteract={canInteract} />
          ) : (
            <VoteWidget
              fixtureId={fixture.id}
              netVotes={netVotes}
              userVote={userVote}
              canInteract={canInteract}
            />
          )}
          <span
            title={
              fixture.trustStatus === "OFFICIAL"
                ? "Official, scraped from the league"
                : fixture.trustStatus === "COMMUNITY_VERIFIED"
                  ? "Community verified (+3 net votes)"
                  : "Community submitted, awaiting verification"
            }
            className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500"
          >
            {fixture.trustStatus === "OFFICIAL" ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <Users
                className={`h-3.5 w-3.5 ${
                  fixture.trustStatus === "COMMUNITY_VERIFIED" ? "text-emerald-500 dark:text-emerald-400" : ""
                }`}
              />
            )}
          </span>
        </span>
      </div>
    </div>
  );
}
