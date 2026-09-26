import { describe, expect, it } from "vitest";
import { paginationMeta, parsePagination } from "./pagination";

describe("parsePagination", () => {
  it("defaults to page 1, pageSize 20 when no params are given", () => {
    const result = parsePagination(new URLSearchParams());
    expect(result).toEqual({ page: 1, pageSize: 20, offset: 0 });
  });

  it("computes the offset from page and pageSize", () => {
    const result = parsePagination(new URLSearchParams("page=3&pageSize=10"));
    expect(result).toEqual({ page: 3, pageSize: 10, offset: 20 });
  });

  it("clamps page below 1 up to 1", () => {
    const result = parsePagination(new URLSearchParams("page=0"));
    expect(result.page).toBe(1);
  });

  it("clamps a negative page up to 1", () => {
    const result = parsePagination(new URLSearchParams("page=-5"));
    expect(result.page).toBe(1);
  });

  it("clamps pageSize above the max down to 100", () => {
    const result = parsePagination(new URLSearchParams("pageSize=500"));
    expect(result.pageSize).toBe(100);
  });

  it("falls back to the default pageSize when pageSize=0 (0 is falsy, so `|| DEFAULT_PAGE_SIZE` kicks in)", () => {
    const result = parsePagination(new URLSearchParams("pageSize=0"));
    expect(result.pageSize).toBe(20);
  });

  it("clamps a negative pageSize up to 1", () => {
    const result = parsePagination(new URLSearchParams("pageSize=-5"));
    expect(result.pageSize).toBe(1);
  });

  it("ignores non-numeric params and falls back to defaults", () => {
    const result = parsePagination(new URLSearchParams("page=abc&pageSize=xyz"));
    expect(result).toEqual({ page: 1, pageSize: 20, offset: 0 });
  });
});

describe("paginationMeta", () => {
  it("computes totalPages, rounding up", () => {
    const meta = paginationMeta({ page: 1, pageSize: 10, offset: 0 }, 25);
    expect(meta).toEqual({ page: 1, pageSize: 10, total: 25, totalPages: 3 });
  });

  it("returns at least 1 total page even when total is 0", () => {
    const meta = paginationMeta({ page: 1, pageSize: 10, offset: 0 }, 0);
    expect(meta.totalPages).toBe(1);
  });

  it("returns exactly 1 page when total divides evenly by pageSize", () => {
    const meta = paginationMeta({ page: 1, pageSize: 10, offset: 0 }, 10);
    expect(meta.totalPages).toBe(1);
  });
});
