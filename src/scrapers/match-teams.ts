/**
 * Fuzzy matching utilities for reconciling scraped team names (which vary in
 * capitalization, abbreviation, and punctuation across sources) against the
 * canonical `teams` records already stored in the database.
 */

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein edit distance between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Similarity score in [0, 1], where 1 is an exact match after normalization. */
export function similarity(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  if (normA === normB) return 1;
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(normA, normB) / maxLen;
}

export interface MatchCandidate {
  id: string;
  name: string;
  shortName?: string | null;
}

export interface TeamMatch<T extends MatchCandidate> {
  candidate: T;
  score: number;
}

/**
 * Finds the best matching team record for a scraped team name.
 *
 * Matches against both `name` and `shortName`, taking whichever scores
 * higher. Returns null if nothing clears `minScore` (default 0.6).
 */
export function findBestTeamMatch<T extends MatchCandidate>(
  scrapedName: string,
  candidates: T[],
  minScore = 0.6,
): TeamMatch<T> | null {
  let best: TeamMatch<T> | null = null;

  for (const candidate of candidates) {
    const nameScore = similarity(scrapedName, candidate.name);
    const shortNameScore = candidate.shortName
      ? similarity(scrapedName, candidate.shortName)
      : 0;
    const score = Math.max(nameScore, shortNameScore);

    if (!best || score > best.score) {
      best = { candidate, score };
    }
  }

  if (!best || best.score < minScore) return null;
  return best;
}
