-- Run this in the Supabase SQL Editor AFTER schema_v21.sql.
--
-- Same idea as cover_banner_position_y (schema_v18.sql) but for the profile
-- photo: an artist can drag it to adjust what's visible within the circular
-- frame, and that same crop now shows up everywhere the photo is used
-- (listing cards, public profile, previews), not just in the editor.
alter table public.artists
  add column if not exists profile_picture_position_y numeric not null default 50;

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
  video_thumbnails,
  profile_picture_position_y
from public.artists
where status = 'published';
