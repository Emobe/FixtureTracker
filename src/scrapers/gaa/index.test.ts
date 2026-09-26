import { describe, expect, it } from "vitest";
import { extractMatches, parseMatchDate } from "./index";

describe("parseMatchDate", () => {
  it("reads the wall-clock date/time, ignoring the bogus +00:00 offset", () => {
    expect(parseMatchDate("2026-05-23T14:00:00+00:00")).toEqual({
      year: 2026,
      month: 5,
      day: 23,
      hour: 14,
      minute: 0,
    });
  });

  it("returns null for an unparsable string", () => {
    expect(parseMatchDate("not-a-date")).toBeNull();
  });
});

describe("extractMatches", () => {
  function flightHtml(id: number, ...jsonLines: string[]) {
    const payload = jsonLines.join("\\n");
    const escaped = payload.replace(/"/g, '\\"');
    return `<script>self.__next_f.push([${id},"${escaped}"])</script>`;
  }

  it("extracts a match array from a single-push flight payload", () => {
    const matches = [{ matchId: "m1", homeTeam: { name: "Kerry" }, awayTeam: { name: "Mayo" } }];
    const html = flightHtml(1, `abc123:${JSON.stringify(matches)}`);

    const result = extractMatches(html);
    expect(result).toEqual(matches);
  });

  it("concatenates multiple pushes sharing the same flight id before parsing", () => {
    const matches = [{ matchId: "m2", homeTeam: { name: "Cork" }, awayTeam: { name: "Dublin" } }];
    const fullLine = `abc123:${JSON.stringify(matches)}`;
    // Split the line's content across two pushes with the same id, as the
    // real page does — this is exactly the case that broke when each push
    // was treated as a self-contained fragment.
    const splitPoint = Math.floor(fullLine.length / 2);
    const part1 = fullLine.slice(0, splitPoint).replace(/"/g, '\\"');
    const part2 = fullLine.slice(splitPoint).replace(/"/g, '\\"');
    const html = `<script>self.__next_f.push([7,"${part1}"])</script><script>self.__next_f.push([7,"${part2}"])</script>`;

    const result = extractMatches(html);
    expect(result).toEqual(matches);
  });

  it("returns an empty array when there's no matching flight payload", () => {
    expect(extractMatches("<html><body>nothing here</body></html>")).toEqual([]);
  });

  it("ignores flight lines that don't contain matchId", () => {
    const html = flightHtml(1, `abc:${JSON.stringify({ unrelated: true })}`);
    expect(extractMatches(html)).toEqual([]);
  });
});
