-- Run this in the Supabase SQL Editor AFTER schema_v3.sql.
-- Adds coordinates for distance-based search. These are geocoded from the
-- artist's own city/locality (never a street address), and from the
-- client's chosen search location — never raw GPS/device data. Only the
-- computed distance is ever shown to the other party; these coordinates
-- themselves are not exposed by any public-facing UI.

alter table public.artists
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.client_preferences
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
