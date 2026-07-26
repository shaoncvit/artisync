-- Run this in the Supabase SQL Editor AFTER schema_v22.sql.
--
-- Clients could only ever be created once at onboarding and never edited
-- again, and an artist looking at a job posting had no way to see anything
-- about the client beyond their bare name. This adds a few optional profile
-- fields, lets a client update their own row (no UPDATE policy existed
-- before this), and exposes a public-safe view — the same pattern already
-- used for artists_public / jobs_open — so an artist can view a client's
-- profile without needing direct SELECT access to the RLS-restricted
-- clients table (which stays owner-only for phone/email).

alter table public.clients
  add column if not exists profile_picture_url text not null default '',
  add column if not exists organization_name text not null default '',
  add column if not exists bio text not null default '';

create policy "Users can update their own client record"
  on public.clients for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace view public.clients_public as
select
  id, full_name, organization_name, bio, profile_picture_url, city, state, created_at
from public.clients;

grant select on public.clients_public to authenticated;
