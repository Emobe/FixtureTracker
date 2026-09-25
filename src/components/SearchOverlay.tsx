"use client";

import { Search, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface TeamResult {
  slug: string;
  name: string;
  shortName: string | null;
  crestUrl: string | null;
  sport: { name: string };
}

interface CompetitionResult {
  slug: string;
  name: string;
  sport: { name: string };
}

export function SearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function open() {
    setIsOpen(true);
    // Wait for the overlay to mount before focusing.
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function close() {
    setIsOpen(false);
    setQuery("");
    setTeams([]);
    setCompetitions([]);
  }

  useEffect(() => {
    if (query.trim().length < 2) {
      // Don't clear results here — that would be a synchronous setState in
      // an effect. Stale results are hidden by gating rendering on
      // `hasQuery` below instead.
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setIsLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setTeams(data.teams ?? []);
          setCompetitions(data.competitions ?? []);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const hasQuery = query.trim().length >= 2;
  const hasResults = hasQuery && (teams.length > 0 || competitions.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Search teams and competitions"
        className="tap-active flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <Search className="h-[18px] w-[18px]" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col bg-black/50 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="mx-auto flex w-full max-w-3xl flex-col bg-surface sm:mt-16 sm:max-h-[70vh] sm:rounded-2xl sm:border sm:border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border p-3">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search teams and competitions…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
              />
              <button
                type="button"
                onClick={close}
                aria-label="Close search"
                className="tap-active shrink-0 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-2">
              {!hasQuery && (
                <p className="p-4 text-center text-sm text-zinc-400 dark:text-zinc-600">
                  Type at least 2 characters to search.
                </p>
              )}
              {hasQuery && isLoading && (
                <p className="p-4 text-center text-sm text-zinc-400 dark:text-zinc-600">Searching…</p>
              )}
              {hasQuery && !isLoading && !hasResults && (
                <p className="p-4 text-center text-sm text-zinc-400 dark:text-zinc-600">
                  No teams or competitions match &ldquo;{query.trim()}&rdquo;.
                </p>
              )}

              {hasQuery && teams.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">Teams</p>
                  {teams.map((team) => (
                    <Link
                      key={team.slug}
                      href={`/teams/${team.slug}`}
                      onClick={close}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                      {team.crestUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain crest URLs.
                        <img src={team.crestUrl} alt="" className="h-7 w-7 shrink-0 object-contain" />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          {(team.shortName ?? team.name).slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="flex-1 truncate font-medium">{team.name}</span>
                      <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">{team.sport.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              {hasQuery && competitions.length > 0 && (
                <div>
                  <p className="px-2 py-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                    Competitions
                  </p>
                  {competitions.map((competition) => (
                    <Link
                      key={competition.slug}
                      href={`/competitions/${competition.slug}`}
                      onClick={close}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                        <Trophy className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 truncate font-medium">{competition.name}</span>
                      <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                        {competition.sport.name}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
