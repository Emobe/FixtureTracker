import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request for a fresh key", () => {
    const result = checkRateLimit(`key-${Math.random()}`);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
  });

  it("counts down remaining requests within the window", () => {
    const key = `key-${Math.random()}`;
    checkRateLimit(key);
    const second = checkRateLimit(key);
    expect(second.remaining).toBe(58);
  });

  it("blocks once the limit is exceeded", () => {
    const key = `key-${Math.random()}`;
    let last;
    for (let i = 0; i < 61; i++) last = checkRateLimit(key);
    expect(last!.allowed).toBe(false);
    expect(last!.remaining).toBe(0);
  });

  it("resets the count after the window elapses", () => {
    vi.useFakeTimers();
    const key = `key-${Math.random()}`;
    for (let i = 0; i < 61; i++) checkRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    const afterReset = checkRateLimit(key);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(59);
  });

  it("tracks separate keys independently", () => {
    const keyA = `key-a-${Math.random()}`;
    const keyB = `key-b-${Math.random()}`;
    for (let i = 0; i < 61; i++) checkRateLimit(keyA);
    expect(checkRateLimit(keyA).allowed).toBe(false);
    expect(checkRateLimit(keyB).allowed).toBe(true);
  });
});
