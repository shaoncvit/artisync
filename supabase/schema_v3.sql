-- Run this in the Supabase SQL Editor AFTER schema.sql, storage.sql, and schema_v2.sql.
-- Adds client_preferences for the Phase 8 preference wizard, used by the
-- Phase 9/10 discovery + matching features.

create table if not exists public.client_preferences (
  client_id uuid primary key references auth.users(id) on delete cascade,

  artist_categories text[] not null default '{}',
  event_types text[] not null default '{}',

  city text not null default '',
  state text not null default '',
  locality text not null default '',
  performance_mode text not null default '',        -- 'Online' | 'Offline' | 'Either'
  consider_travelling_artists boolean not null default false,
  venue text not null default '',

  event_date date,
  date_not_decided boolean not null default false,
  date_flexible boolean not null default false,
  date_range_start date,
  date_range_end date,
  preferred_time text not null default '',
  approximate_duration text not null default '',
  recurrence text not null default '',              -- 'One-time' | 'Recurring'

  budget_min text not null default '',
  budget_max text not null default '',
  budget_negotiable boolean not null default false,
  let_artists_quote boolean not null default false,
  budget_not_sure boolean not null default false,

  preferred_languages text[] not null default '{}',
  specializations text[] not null default '{}',
  genres text[] not null default '{}',
  group_type_preference text not null default '',    -- 'Solo' | 'Group' | ''
  experience_preference text not null default '',
  equipment_requirements text not null default '',
  additional_notes text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_preferences enable row level security;

create policy "Clients can read their own preferences"
  on public.client_preferences for select
  using (auth.uid() = client_id);

create policy "Clients can insert their own preferences"
  on public.client_preferences for insert
  with check (auth.uid() = client_id);

create policy "Clients can update their own preferences"
  on public.client_preferences for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

drop trigger if exists client_preferences_set_updated_at on public.client_preferences;
create trigger client_preferences_set_updated_at
  before update on public.client_preferences
  for each row execute function public.set_updated_at();
