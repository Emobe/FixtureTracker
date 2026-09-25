import * as cheerio from "cheerio";

export type ScrapedFixtureStatus =
  | "SCHEDULED"
  | "POSTPONED"
  | "CANCELLED"
  | "COMPLETED";

export interface ScrapedFixtureResult {
  homeScoreDisplay: string;
  awayScoreDisplay: string;
  /** Adapter-specific structured breakdown (e.g. GAA goals/points). */
  scoreData?: Record<string, unknown>;
}

/** Normalized fixture shape every scraper adapter must emit. */
export interface ScrapedFixture {
  homeTeam: string;
  awayTeam: string;
  /** ISO 8601 UTC timestamp. */
  startTimeUTC: string;
  venueName: string | null;
  round: string | null;
  competitionSlug: string;
  status: ScrapedFixtureStatus;
  broadcastInfo?: string | null;
  streamUrl?: string | null;
  result?: ScrapedFixtureResult;
}

export interface BaseScraperOptions {
  /** Minimum delay between outgoing requests, in ms. Default 1000. */
  minDelayMs?: number;
  /** User-Agent string sent with every request. */
  userAgent?: string;
  /** Extra headers merged into every request. */
  headers?: Record<string, string>;
}

const DEFAULT_USER_AGENT =
  "SportsFixturesBot/1.0 (+https://github.com/sports-fixtures; fixtures ingestion)";

/**
 * Base class for all league-specific scraper adapters.
 *
 * Handles polite rate-limiting and a consistent fetch/parse wrapper so
 * individual adapters (src/scrapers/<league>/index.ts) only need to
 * implement `scrape()`.
 */
export abstract class BaseScraper {
  protected readonly minDelayMs: number;
  protected readonly userAgent: string;
  protected readonly extraHeaders: Record<string, string>;
  private lastRequestAt = 0;

  constructor(options: BaseScraperOptions = {}) {
    this.minDelayMs = options.minDelayMs ?? 1000;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.extraHeaders = options.headers ?? {};
  }

  /** Adapter entrypoint: fetch + parse the source into normalized fixtures. */
  abstract scrape(): Promise<ScrapedFixture[]>;

  /** Human-readable adapter name, used in logs. */
  abstract get name(): string;

  protected async wait() {
    const elapsed = Date.now() - this.lastRequestAt;
    const remaining = this.minDelayMs - elapsed;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    this.lastRequestAt = Date.now();
  }

  /** Rate-limited fetch wrapper with a standard User-Agent and error logging. */
  protected async fetchText(
    url: string,
    init: RequestInit = {},
  ): Promise<string> {
    await this.wait();
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "User-Agent": this.userAgent,
          ...this.extraHeaders,
          ...init.headers,
        },
      });
      if (!response.ok) {
        throw new Error(
          `${this.name}: request to ${url} failed with status ${response.status}`,
        );
      }
      return await response.text();
    } catch (err) {
      this.logError(`fetch failed for ${url}`, err);
      throw err;
    }
  }

  /** Fetch a URL and parse it into a cheerio document. */
  protected async fetchHtml(
    url: string,
    init: RequestInit = {},
  ): Promise<cheerio.CheerioAPI> {
    const html = await this.fetchText(url, init);
    return cheerio.load(html);
  }

  protected logError(message: string, err?: unknown): void {
    console.error(`[${this.name}] ${message}`, err ?? "");
  }

  protected logInfo(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
}
