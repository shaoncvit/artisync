import type { Coordinates } from "./distance";

/** Geocodes a city/locality string (e.g. "Bandra, Mumbai, Maharashtra") via our /api/geocode proxy. */
export async function geocodeLocation(query: string): Promise<Coordinates | null> {
  if (!query.trim()) return null;
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.lat === "number" && typeof data.lng === "number" ? { lat: data.lat, lng: data.lng } : null;
  } catch {
    return null;
  }
}
