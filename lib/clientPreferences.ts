export type ClientPreferences = {
  artistCategories: string[];
  eventTypes: string[];
  city: string;
  state: string;
  locality: string;
  performanceMode: string;
  considerTravellingArtists: boolean;
  venue: string;
  eventDate: string | null;
  dateNotDecided: boolean;
  dateFlexible: boolean;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  preferredTime: string;
  approximateDuration: string;
  recurrence: string;
  budgetMin: string;
  budgetMax: string;
  budgetNegotiable: boolean;
  letArtistsQuote: boolean;
  budgetNotSure: boolean;
  preferredLanguages: string[];
  specializations: string[];
  genres: string[];
  groupTypePreference: string;
  experiencePreference: string;
  equipmentRequirements: string;
  additionalNotes: string;
  /** Geocoded from city/locality — used only to compute distance, never shown directly. */
  latitude: number | null;
  longitude: number | null;
};

export const EMPTY_CLIENT_PREFERENCES: ClientPreferences = {
  artistCategories: [], eventTypes: [],
  city: "", state: "", locality: "", performanceMode: "", considerTravellingArtists: false, venue: "",
  eventDate: null, dateNotDecided: false, dateFlexible: false, dateRangeStart: null, dateRangeEnd: null,
  preferredTime: "", approximateDuration: "", recurrence: "",
  budgetMin: "", budgetMax: "", budgetNegotiable: false, letArtistsQuote: false, budgetNotSure: false,
  preferredLanguages: [], specializations: [], genres: [], groupTypePreference: "",
  experiencePreference: "", equipmentRequirements: "", additionalNotes: "",
  latitude: null, longitude: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapClientPreferencesRow(d: any): ClientPreferences {
  return {
    artistCategories: d.artist_categories ?? [],
    eventTypes: d.event_types ?? [],
    city: d.city ?? "", state: d.state ?? "", locality: d.locality ?? "",
    performanceMode: d.performance_mode ?? "", considerTravellingArtists: d.consider_travelling_artists ?? false,
    venue: d.venue ?? "",
    eventDate: d.event_date ?? null, dateNotDecided: d.date_not_decided ?? false, dateFlexible: d.date_flexible ?? false,
    dateRangeStart: d.date_range_start ?? null, dateRangeEnd: d.date_range_end ?? null,
    preferredTime: d.preferred_time ?? "", approximateDuration: d.approximate_duration ?? "", recurrence: d.recurrence ?? "",
    budgetMin: d.budget_min ?? "", budgetMax: d.budget_max ?? "", budgetNegotiable: d.budget_negotiable ?? false,
    letArtistsQuote: d.let_artists_quote ?? false, budgetNotSure: d.budget_not_sure ?? false,
    preferredLanguages: d.preferred_languages ?? [], specializations: d.specializations ?? [], genres: d.genres ?? [],
    groupTypePreference: d.group_type_preference ?? "", experiencePreference: d.experience_preference ?? "",
    equipmentRequirements: d.equipment_requirements ?? "", additionalNotes: d.additional_notes ?? "",
    latitude: typeof d.latitude === "number" ? d.latitude : null,
    longitude: typeof d.longitude === "number" ? d.longitude : null,
  };
}

export function toClientPreferencesRow(clientId: string, p: ClientPreferences) {
  return {
    client_id: clientId,
    artist_categories: p.artistCategories, event_types: p.eventTypes,
    city: p.city, state: p.state, locality: p.locality,
    latitude: p.latitude, longitude: p.longitude,
    performance_mode: p.performanceMode, consider_travelling_artists: p.considerTravellingArtists, venue: p.venue,
    event_date: p.eventDate || null, date_not_decided: p.dateNotDecided, date_flexible: p.dateFlexible,
    date_range_start: p.dateRangeStart || null, date_range_end: p.dateRangeEnd || null,
    preferred_time: p.preferredTime, approximate_duration: p.approximateDuration, recurrence: p.recurrence,
    budget_min: p.budgetMin, budget_max: p.budgetMax, budget_negotiable: p.budgetNegotiable,
    let_artists_quote: p.letArtistsQuote, budget_not_sure: p.budgetNotSure,
    preferred_languages: p.preferredLanguages, specializations: p.specializations, genres: p.genres,
    group_type_preference: p.groupTypePreference, experience_preference: p.experiencePreference,
    equipment_requirements: p.equipmentRequirements, additional_notes: p.additionalNotes,
  };
}
