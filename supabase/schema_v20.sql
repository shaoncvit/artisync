-- Run this in the Supabase SQL Editor AFTER schema_v19.sql.
--
-- Instagram has no reliable public thumbnail API — the media-redirect trick
-- (schema_v18-era lib/youtube.ts getInstagramThumbnail) fails often enough
-- that Instagram video cards frequently fall back to a plain gradient tile,
-- unlike YouTube links which always get a real thumbnail automatically.
-- This lets an artist upload their own thumbnail image per video link (used
-- for Instagram; harmless no-op for YouTube, which never needs one), so an
-- Instagram entry can look just as good as a YouTube one.
alter table public.artists
  add column if not exists video_thumbnails text[] not null default '{}';

-- Append-only: CREATE OR REPLACE VIEW can only add columns at the end.
create or replace view public.artists_public as
select
  id, full_name, stage_name, headline, bio,
  profile_picture_url, cover_banner_url,
  art_form, art_sub_forms, skills, genres, instruments, group_type,
  experience, languages, event_types, price_range, pricing_unit,
  price_negotiable, availability_status, work_mode, booking_types,
  travel_available, travel_preference, event_duration, equipment_info,
  youtube_videos, youtube_video_captions,
  performance_image_urls, performance_image_captions,
  state, city, area, country,
  instagram, facebook, youtube,
  status, latitude, longitude,
  created_at, updated_at,
  slug,
  artist_is_indexable(artists.*) as is_indexable,
  cover_banner_position_y,
  video_thumbnails
from public.artists
where status = 'published';
