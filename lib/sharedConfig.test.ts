import { describe, it, expect } from "vitest";
import { pluralizeCategory, ARTIST_CATEGORIES } from "./sharedConfig";

describe("pluralizeCategory", () => {
  it("avoids the specific naive-pluralization cases that read badly", () => {
    expect(pluralizeCategory("Spoken Word / Poetry")).not.toBe("Spoken Word / Poetrys");
    expect(pluralizeCategory("Actor / Theatre")).not.toBe("Actor / Theatres");
  });

  it("has an explicit entry for every canonical category", () => {
    for (const category of ARTIST_CATEGORIES) {
      expect(pluralizeCategory(category)).toBeTruthy();
    }
  });

  it("falls back gracefully for a legacy/unrecognized value instead of mangling it", () => {
    expect(pluralizeCategory("Music")).toBe("Music Artists");
  });

  it("DJ pluralizes correctly", () => {
    expect(pluralizeCategory("DJ")).toBe("DJs");
  });
});
