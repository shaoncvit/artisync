import type { NextApiRequest, NextApiResponse } from "next";

type GeocodeResponse = { lat: number | null; lng: number | null; error?: string };

/**
 * Server-side proxy for OpenStreetMap's Nominatim geocoder. Runs server-side
 * (not client fetch) because Nominatim's usage policy requires a descriptive
 * User-Agent identifying the application, which browsers won't let JS set.
 * Only ever geocodes a city/locality string — never a street address.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<GeocodeResponse>) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return res.status(400).json({ lat: null, lng: null, error: "Missing query" });

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "ArtiSync/1.0 (https://www.artisync.in)" },
    });
    if (!response.ok) return res.status(502).json({ lat: null, lng: null, error: "Geocoding service error" });

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) return res.status(200).json({ lat: null, lng: null });

    const { lat, lon } = results[0];
    return res.status(200).json({ lat: parseFloat(lat), lng: parseFloat(lon) });
  } catch {
    return res.status(500).json({ lat: null, lng: null, error: "Geocoding failed" });
  }
}
