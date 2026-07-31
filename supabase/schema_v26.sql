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

create or replace view public.clients_public as
select
  id, full_name, organization_name, bio, profile_picture_url, cover_banner_url,
  photo_urls, city, state, created_at
from public.clients;

grant select on public.clients_public to authenticated;
