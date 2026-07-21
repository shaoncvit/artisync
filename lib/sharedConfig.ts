// Shared configuration values used by both the client-preferences wizard
// (Phase 8) and the artist-discovery page (Phase 9), so the two speak the
// same vocabulary for matching purposes.

export const ARTIST_CATEGORIES = [
  "Singer", "Musician", "Band", "Dancer", "DJ", "Actor", "Theatre Artist",
  "Comedian", "Magician", "Anchor or Emcee", "Photographer", "Visual Artist",
  "Makeup Artist", "Choreographer", "Other",
];

export const CLIENT_EVENT_TYPES = [
  "Wedding", "Reception", "Birthday", "Corporate Event", "College Festival",
  "Cultural Programme", "Religious Event", "Private Party", "Concert",
  "Theatre Production", "Film or Video Production", "Workshop",
  "Online Event", "Brand Collaboration", "Photoshoot", "Other",
];

export const LANGUAGES = ["Hindi","English","Bengali","Tamil","Telugu","Marathi","Gujarati","Kannada","Malayalam","Punjabi","Odia","Urdu","Sanskrit","Bhojpuri","Rajasthani"];

export const BUDGET_RANGES = [
  { label: "Under ₹5,000", min: 0, max: 5000 },
  { label: "₹5,000–₹15,000", min: 5000, max: 15000 },
  { label: "₹15,000–₹30,000", min: 15000, max: 30000 },
  { label: "₹30,000–₹50,000", min: 30000, max: 50000 },
  { label: "₹50,000+", min: 50000, max: null },
];

export const PERFORMANCE_MODES = ["Online", "Offline", "Either"];
export const GROUP_TYPE_OPTIONS = ["Solo", "Group", "Either"];
export const EXPERIENCE_PREFERENCES = ["Any", "Beginner-friendly", "Experienced (3+ years)", "Highly experienced (6+ years)"];
