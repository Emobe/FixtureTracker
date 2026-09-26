import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { buildFixtureGrid, parseScore, parseWikipediaDate } from "./index";

describe("parseWikipediaDate", () => {
  it("parses a standard Wikipedia fixture date/time", () => {
    expect(parseWikipediaDate("12 September 2026, 15:00")).toEqual({
      year: 2026,
      month: 9,
      day: 12,
      hour: 15,
      minute: 0,
    });
  });

  it("returns null for unparsable text", () => {
    expect(parseWikipediaDate("TBC")).toBeNull();
  });

  it("returns null for an unrecognised month name", () => {
    expect(parseWikipediaDate("12 Notamonth 2026, 15:00")).toBeNull();
  });
});

describe("parseScore", () => {
  it("parses a normal final score", () => {
    expect(parseScore("48-16")).toEqual({ home: 48, away: 16 });
  });

  it("parses a score with an en-dash and spaces", () => {
    expect(parseScore("22 – 18")).toEqual({ home: 22, away: 18 });
  });

  it("strips golden-point annotations before parsing", () => {
    expect(parseScore("23-22 (g.p.)")).toEqual({ home: 23, away: 22 });
  });

  it("detects a postponed match regardless of case", () => {
    expect(parseScore("Postponed")).toBe("POSTPONED");
    expect(parseScore("POSTP.")).toBe("POSTPONED");
  });

  it("detects an awarded match", () => {
    expect(parseScore("Awarded 2-0")).toBe("POSTPONED");
  });

  it("returns null for a blank / not-yet-played cell", () => {
    expect(parseScore("")).toBeNull();
    expect(parseScore("-")).toBeNull();
  });
});

describe("buildFixtureGrid", () => {
  function grid(html: string) {
    const $ = cheerio.load(html);
    const table = $("table").first();
    return buildFixtureGrid(table, $);
  }

  it("reads a simple table with no rowspans", () => {
    const rows = grid(`
      <table><tbody>
        <tr><td>A</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td></tr>
        <tr><td>B</td><td>7</td><td>8</td><td>9</td><td>10</td><td>11</td><td>12</td></tr>
      </tbody></table>
    `);
    expect(rows).toHaveLength(2);
    expect(rows[0].map((c) => c.text())).toEqual(["A", "1", "2", "3", "4", "5", "6"]);
    expect(rows[1].map((c) => c.text())).toEqual(["B", "7", "8", "9", "10", "11", "12"]);
  });

  it("carries a rowspan cell forward across the rows it covers (e.g. a shared Magic Weekend date)", () => {
    const rows = grid(`
      <table><tbody>
        <tr>
          <td>Home1</td><td>10-6</td><td>Away1</td>
          <td rowspan="2">16 May 2026, 14:00</td>
          <td rowspan="2">Anfield</td>
          <td>Ref1</td><td>10000</td>
        </tr>
        <tr><td>Home2</td><td>20-4</td><td>Away2</td><td>Ref2</td><td>12000</td></tr>
      </tbody></table>
    `);
    expect(rows).toHaveLength(2);
    // Row 2 should have the same Date/Venue cell content carried over from row 1.
    expect(rows[1][3].text()).toBe("16 May 2026, 14:00");
    expect(rows[1][4].text()).toBe("Anfield");
    expect(rows[1][0].text()).toBe("Home2");
  });

  it("skips header rows with no <td> cells", () => {
    const rows = grid(`
      <table><tbody>
        <tr><th>Home</th><th>Score</th><th>Away</th><th>Date</th><th>Venue</th><th>Ref</th><th>Att.</th></tr>
        <tr><td>A</td><td>1-0</td><td>B</td><td>1 Jan 2026, 12:00</td><td>V</td><td>R</td><td>100</td></tr>
      </tbody></table>
    `);
    expect(rows).toHaveLength(1);
  });
});
