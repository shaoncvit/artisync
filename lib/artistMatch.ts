import type { ArtistProfile } from "./supabaseClient";
import type { ClientPreferences } from "./clientPreferences";
import { getArtistProfileCompleteness } from "./artistProfileCompleteness";
import { haversineDistanceKm, formatDistance } from "./distance";

export type MatchLabel = "Excellent match" | "Great match" | "Good match" | "Partial match";

export type MatchResult = {
  totalScore: number;
  matchLabel: MatchLabel;
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  reasons: string[];
};

export type ArtistForMatch = Pick<
  ArtistProfile,
  | "artForm" | "city" | "state" | "travelAvailable" | "eventTypes" | "priceRange"
  | "availabilityStatus" | "languages" | "artSubForms" | "skills" | "genres" | "workMode"
  | "performanceImageUrls" | "youtubeVideos" | "fullName" | "profilePictureUrl" | "bio"
  | "phone" | "email" | "latitude" | "longitude"
>;

// Distance thresholds, in km — deliberately generous since city-level
// geocoding has a natural margin of error, not a precise street address.
const LOCAL_RANGE_KM = 30;
const TRAVEL_RANGE_KM = 300;

// Weights sum to 100. Ordering follows the brief: category highest, then
// location/event/budget/availability (high to medium-high), then
// language/specialization/mode (medium), then portfolio/profile
// completeness (low-medium / low) — these last two are objective quality
// signals rather than preference matches, so they're always evaluated.
const WEIGHTS = {
  category: 22,
  location: 18,
  eventType: 18,
  budget: 13,
  availability: 10,
  language: 7,
  specialization: 6,
  mode: 3,
  portfolio: 2,
  completeness: 1,
};

function parsePrice(v: string | undefined | null): number | null {
  if (!v) return null;
  const cleaned = v.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? null : n;
}

function overlaps(a: string[] | undefined, b: string[] | undefined): string | null {
  if (!a?.length || !b?.length) return null;
  const bLower = b.map((x) => x.toLowerCase());
  const found = a.find((x) => bLower.includes(x.toLowerCase()));
  return found ?? null;
}

function labelFor(score: number): MatchLabel {
  if (score >= 85) return "Excellent match";
  if (score >= 65) return "Great match";
  if (score >= 45) return "Good match";
  return "Partial match";
}

/**
 * Rule-based, explainable match between one artist and a client's stated
 * preferences. Never invents a match for data that's missing on either
 * side — a criterion only counts if the client specified it AND the
 * artist's own profile data actually satisfies it.
 */
export function calculateArtistMatch(artist: ArtistForMatch, prefs: ClientPreferences | null): MatchResult {
  const matched: string[] = [];
  const unmatched: string[] = [];
  const reasons: string[] = [];
  let applicable = 0;
  let earned = 0;

  if (!prefs) {
    return { totalScore: 0, matchLabel: "Partial match", matchedCriteria: [], unmatchedCriteria: [], reasons: [] };
  }

  // Artist category (highest weight)
  if (prefs.artistCategories.length > 0) {
    applicable += WEIGHTS.category;
    const hit = artist.artForm && prefs.artistCategories.some((c) => c.toLowerCase() === artist.artForm.toLowerCase());
    if (hit) {
      earned += WEIGHTS.category;
      matched.push("category");
      reasons.push(`Matches your selected artist category (${artist.artForm})`);
    } else {
      unmatched.push("category");
    }
  }

  // Location or travel compatibility — precise distance when both sides
  // have geocoded coordinates, otherwise fall back to city/state text match.
  if (prefs.city || prefs.state) {
    applicable += WEIGHTS.location;
    let isMatch = false;

    if (artist.latitude != null && artist.longitude != null && prefs.latitude != null && prefs.longitude != null) {
      const km = haversineDistanceKm({ lat: artist.latitude, lng: artist.longitude }, { lat: prefs.latitude, lng: prefs.longitude });
      const withinLocal = km <= LOCAL_RANGE_KM;
      const withinTravel = prefs.considerTravellingArtists && artist.travelAvailable && km <= TRAVEL_RANGE_KM;
      if (withinLocal || withinTravel) {
        isMatch = true;
        reasons.push(withinLocal ? `${formatDistance(km)} from your event location` : `Open to travelling (${formatDistance(km)})`);
      }
    } else {
      const sameCity = !!(artist.city && prefs.city && artist.city.toLowerCase() === prefs.city.toLowerCase());
      const sameState = !!(artist.state && prefs.state && artist.state.toLowerCase() === prefs.state.toLowerCase());
      const travelOk = !!(prefs.considerTravellingArtists && artist.travelAvailable);
      if (sameCity || sameState || travelOk) {
        isMatch = true;
        if (sameCity) reasons.push(`Available in your preferred city (${artist.city})`);
        else if (sameState) reasons.push(`Based in your preferred state (${artist.state})`);
        else reasons.push("Open to travelling for your event");
      }
    }

    if (isMatch) { earned += WEIGHTS.location; matched.push("location"); } else { unmatched.push("location"); }
  }

  // Event type
  if (prefs.eventTypes.length > 0) {
    applicable += WEIGHTS.eventType;
    const hit = overlaps(artist.eventTypes, prefs.eventTypes);
    if (hit) {
      earned += WEIGHTS.eventType;
      matched.push("eventType");
      reasons.push(`Performs at ${hit}`);
    } else {
      unmatched.push("eventType");
    }
  }

  // Budget compatibility
  const hasBudgetPref = !!(prefs.budgetMin || prefs.budgetMax) && !prefs.budgetNotSure && !prefs.letArtistsQuote;
  if (hasBudgetPref) {
    applicable += WEIGHTS.budget;
    const artistPrice = parsePrice(artist.priceRange);
    const prefMin = parsePrice(prefs.budgetMin) ?? 0;
    const prefMax = parsePrice(prefs.budgetMax);
    if (artistPrice !== null) {
      const withinRange = artistPrice >= prefMin && (prefMax === null || artistPrice <= prefMax);
      if (withinRange || prefs.budgetNegotiable) {
        earned += WEIGHTS.budget;
        matched.push("budget");
        reasons.push("Matches your budget");
      } else {
        unmatched.push("budget");
      }
    } else {
      unmatched.push("budget");
    }
  }

  // Availability — always evaluated (a universal quality signal, not a
  // preference the client sets); missing data never counts as available.
  applicable += WEIGHTS.availability;
  if (artist.availabilityStatus === "Available now") {
    earned += WEIGHTS.availability;
    matched.push("availability");
    reasons.push("Currently available");
  } else {
    unmatched.push("availability");
  }

  // Language
  if (prefs.preferredLanguages.length > 0) {
    applicable += WEIGHTS.language;
    const hits = artist.languages?.filter((l) => prefs.preferredLanguages.some((p) => p.toLowerCase() === l.toLowerCase())) ?? [];
    if (hits.length > 0) {
      earned += WEIGHTS.language;
      matched.push("language");
      reasons.push(`Speaks ${hits.join(" and ")}`);
    } else {
      unmatched.push("language");
    }
  }

  // Specialization or genre
  if (prefs.specializations.length > 0 || prefs.genres.length > 0) {
    applicable += WEIGHTS.specialization;
    const specHit = overlaps([...(artist.artSubForms ?? []), ...(artist.skills ?? [])], prefs.specializations);
    const genreHit = overlaps(artist.genres, prefs.genres);
    if (specHit || genreHit) {
      earned += WEIGHTS.specialization;
      matched.push("specialization");
      reasons.push(`Specializes in ${specHit ?? genreHit}`);
    } else {
      unmatched.push("specialization");
    }
  }

  // Performance mode
  if (prefs.performanceMode) {
    applicable += WEIGHTS.mode;
    const compatible =
      prefs.performanceMode === "Either" ||
      artist.workMode === "Either" ||
      artist.workMode === prefs.performanceMode;
    if (compatible && artist.workMode) {
      earned += WEIGHTS.mode;
      matched.push("mode");
      reasons.push(`Offers ${artist.workMode.toLowerCase()} performances`);
    } else {
      unmatched.push("mode");
    }
  }

  // Portfolio (objective quality signal, always evaluated)
  applicable += WEIGHTS.portfolio;
  const hasPortfolio = (artist.performanceImageUrls?.length ?? 0) > 0 || (artist.youtubeVideos?.filter(Boolean).length ?? 0) > 0;
  if (hasPortfolio) {
    earned += WEIGHTS.portfolio;
    matched.push("portfolio");
    reasons.push("Has relevant portfolio work");
  } else {
    unmatched.push("portfolio");
  }

  // Overall profile completeness (objective quality signal, always evaluated)
  applicable += WEIGHTS.completeness;
  const completeness = getArtistProfileCompleteness(artist);
  earned += WEIGHTS.completeness * (completeness.percentage / 100);

  const totalScore = applicable > 0 ? Math.round((earned / applicable) * 100) : 0;

  return {
    totalScore,
    matchLabel: labelFor(totalScore),
    matchedCriteria: matched,
    unmatchedCriteria: unmatched,
    reasons: reasons.slice(0, 4),
  };
}
