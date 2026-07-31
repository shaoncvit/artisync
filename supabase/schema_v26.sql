-- Run this in the Supabase SQL Editor AFTER schema_v25.sql.
--
-- Client profiles gain an optional cover photo and a small photo gallery
-- (e.g. past events, venues) — mirrors the artist profile's cover
-- banner/portfolio fields but intentionally lighter (no caption/reorder
-- machinery). Join date was already computed from clients.created_at,
-- exposed via clients_public.

alter table public.clients
  add column if not exists cover_banner_url text not null default '',
  add column if not exists photo_urls text[] not null default '{}';

-- create or replace view can only append new columns at the end, never
-- insert them into the middle of the existing column list — so the two
-- new columns go after created_at, not alongside the other picture fields.
create or replace view public.clients_public as
select
  id, full_name, organization_name, bio, profile_picture_url, city, state, created_at,
  cover_banner_url, photo_urls
from public.clients;

grant select on public.clients_public to authenticated;
