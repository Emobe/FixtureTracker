import { describe, expect, it } from "vitest";
import { slugify } from "./db-helpers";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Wigan Warriors")).toBe("wigan-warriors");
  });

  it("strips accents", () => {
    expect(slugify("Sébastien")).toBe("sebastien");
  });

  it("strips punctuation", () => {
    expect(slugify("Hull F.C.")).toBe("hull-f-c");
  });

  it("collapses repeated separators into one hyphen", () => {
    expect(slugify("Hull  &  KR")).toBe("hull-kr");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("-Leigh Leopards-")).toBe("leigh-leopards");
  });
});
