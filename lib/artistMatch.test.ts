import { describe, it, expect } from "vitest";
import { calculateArtistMatch, type ArtistForMatch } from "./artistMatch";
import { EMPTY_CLIENT_PREFERENCES, type ClientPreferences } from "./clientPreferences";

function makeArtist(overrides: Partial<ArtistForMatch> = {}): ArtistForMatch {
  return {
    artForm: "Musician",
    city: "Mumbai",
    state: "Maharashtra",
    travelAvailable: false,
    eventTypes: ["Wedding"],
    priceRange: "10000",
    availabilityStatus: "Available now",
    languages: ["Hindi", "English"],
    artSubForms: ["Guitarist"],
    skills: [],
    genres: ["Classical"],
    workMode: "Offline",
    performanceImageUrls: ["https://example.com/a.jpg"],
    youtubeVideos: [],
    fullName: "Test Artist",
    profilePictureUrl: "https://example.com/p.jpg",
    bio: "A bio.",
    phone: "9999999999",
    email: "artist@example.com",
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

function makePrefs(overrides: Partial<ClientPreferences> = {}): ClientPreferences {
  return { ...EMPTY_CLIENT_PREFERENCES, ...overrides };
}

describe("calculateArtistMatch", () => {
  it("scores a perfect match highly and explains why", () => {
    const artist = makeArtist();
    const prefs = makePrefs({
      artistCategories: ["Musician"],
      city: "Mumbai",
      state: "Maharashtra",
      eventTypes: ["Wedding"],
      budgetMin: "5000",
      budgetMax: "15000",
      preferredLanguages: ["Hindi"],
      specializations: ["Guitarist"],
      performanceMode: "Offline",
    });
    const result = calculateArtistMatch(artist, prefs);
    expect(result.totalScore).toBeGreaterThanOrEqual(85);
    expect(result.matchLabel).toBe("Excellent match");
    expect(result.matchedCriteria).toContain("category");
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.includes("Musician"))).toBe(true);
  });

  it("penalizes a category mismatch", () => {
    const artist = makeArtist({ artForm: "Dancer" });
    const prefs = makePrefs({ artistCategories: ["Musician"] });
    const result = calculateArtistMatch(artist, prefs);
    expect(result.unmatchedCriteria).toContain("category");
    expect(result.matchedCriteria).not.toContain("category");
  });

  it("penalizes a budget mismatch (artist price above client's max)", () => {
    const artist = makeArtist({ priceRange: "80000" });
    const prefs = makePrefs({ budgetMin: "5000", budgetMax: "15000" });
    const result = calculateArtistMatch(artist, prefs);
    expect(result.unmatchedCriteria).toContain("budget");
  });

  it("credits a travelling artist for out-of-state clients who accept travel", () => {
    const artist = makeArtist({ city: "Delhi", state: "Delhi", travelAvailable: true });
    const prefs = makePrefs({ city: "Mumbai", state: "Maharashtra", considerTravellingArtists: true });
    const result = calculateArtistMatch(artist, prefs);
    expect(result.matchedCriteria).toContain("location");
    expect(result.reasons.some((r) => r.toLowerCase().includes("travel"))).toBe(true);
  });

  it("uses precise geocoded distance over city text when both sides have coordinates", () => {
    // Two points ~5km apart within Mumbai — should match on distance even
    // though the city label itself differs (e.g. suburb vs city name).
    const artist = makeArtist({ city: "Bandra", state: "Maharashtra", latitude: 19.06, longitude: 72.83 });
    const prefs = makePrefs({ city: "Mumbai", state: "Maharashtra", latitude: 19.076, longitude: 72.877 });
    const result = calculateArtistMatch(artist, prefs);
    expect(result.matchedCriteria).toContain("location");
    expect(result.reasons.some((r) => r.includes("km") || r.includes("Nearby"))).toBe(true);
  });

  it("does not match on distance when the artist is far away and not open to travel", () => {
    const artist = makeArtist({ city: "Delhi", state: "Delhi", travelAvailable: false, latitude: 28.6, longitude: 77.2 });
    const prefs = makePrefs({ city: "Mumbai", state: "Maharashtra", considerTravellingArtists: true, latitude: 19.076, longitude: 72.877 });
    const result = calculateArtistMatch(artist, prefs);
    expect(result.unmatchedCriteria).toContain("location");
  });

  it("does not treat missing artist data as a match", () => {
    const artist = makeArtist({
      priceRange: "",
      availabilityStatus: "",
      languages: [],
      city: "",
      state: "",
    });
    const prefs = makePrefs({
      budgetMin: "5000", budgetMax: "15000",
      city: "Mumbai", state: "Maharashtra",
      preferredLanguages: ["Hindi"],
    });
    const result = calculateArtistMatch(artist, prefs);
    expect(result.unmatchedCriteria).toContain("budget");
    expect(result.unmatchedCriteria).toContain("location");
    expect(result.unmatchedCriteria).toContain("language");
    expect(result.unmatchedCriteria).toContain("availability");
    expect(result.matchedCriteria).not.toContain("budget");
    expect(result.matchedCriteria).not.toContain("location");
    expect(result.matchedCriteria).not.toContain("language");
  });

  it("returns a neutral, unexplained result when there are no client preferences", () => {
    const artist = makeArtist();
    const result = calculateArtistMatch(artist, null);
    expect(result.totalScore).toBe(0);
    expect(result.matchedCriteria).toEqual([]);
    expect(result.unmatchedCriteria).toEqual([]);
    expect(result.reasons).toEqual([]);
  });

  it("matches when the artist's category is any one of several selected categories", () => {
    const artist = makeArtist({ artForm: "Dancer" });
    const prefs = makePrefs({ artistCategories: ["Musician", "Dancer", "DJ"] });
    const result = calculateArtistMatch(artist, prefs);
    expect(result.matchedCriteria).toContain("category");
    expect(result.reasons.some((r) => r.includes("Dancer"))).toBe(true);
  });
});
