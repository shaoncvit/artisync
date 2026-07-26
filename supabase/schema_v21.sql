-- Run this in the Supabase SQL Editor AFTER schema_v20.sql.
--
-- Bugfix: handle_artist_slug() (schema_v9.sql) only ran the slug through
-- generate_unique_artist_slug (its collision/dedup check) on UPDATE. On the
-- very first INSERT, if new.slug was already non-empty — which is now
-- always true, since the profile wizard requires a username — it was used
-- verbatim with no uniqueness check at all. Two artists picking the same
-- username at nearly the same time (or one racing the other's live
-- availability check) could hit a hard unique-constraint failure on save
-- instead of the usual auto-suffixed fallback. Route the INSERT case
-- through the same dedup function as UPDATE already does.
create or replace function public.handle_artist_slug()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.slug := public.generate_unique_artist_slug(
      coalesce(nullif(new.slug, ''), nullif(new.stage_name, ''), new.full_name),
      new.id
    );
    return new;
  end if;

  -- UPDATE
  if old.slug is null or old.slug = '' then
    new.slug := public.generate_unique_artist_slug(coalesce(nullif(new.stage_name, ''), new.full_name), new.id);
  elsif new.slug is distinct from old.slug and new.slug is not null and new.slug <> '' then
    insert into public.artist_slug_history (slug, artist_id) values (old.slug, old.id)
    on conflict (slug) do nothing;
    new.slug := public.generate_unique_artist_slug(new.slug, new.id);
  else
    new.slug := old.slug;
  end if;
  return new;
end;
$$;
