-- Run this in the Supabase SQL Editor AFTER schema_v23.sql.
--
-- Powers two email notifications, both sent from application code
-- (pages/api/notify-new-job.ts, pages/api/notify-new-message.ts) via
-- Resend — Postgres itself has no pg_net/http extension enabled in this
-- project, so it can't call an external email API directly. These two
-- functions only ever return the narrow data those routes need (never a
-- full row), following the same security-definer pattern already used by
-- get_contact_info / get_conversation_partner: callable by any
-- authenticated user, but scoped so a caller can only ever pull data
-- tied to something they actually own or participate in.

-- Artists whose category + city match a given job — used to notify them
-- by email that a matching job was just posted. Only the client who
-- posted the job can call this for it.
create or replace function public.get_job_notification_targets(p_job_id uuid)
returns table (email text, full_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_art_form text;
  v_city text;
begin
  select j.client_id, j.art_form, j.city into v_client_id, v_art_form, v_city
  from public.jobs j
  where j.id = p_job_id;

  if v_client_id is null or v_client_id <> auth.uid() then
    return;
  end if;

  return query
    select a.email, coalesce(nullif(a.stage_name, ''), nullif(a.full_name, ''), 'there')
    from public.artists a
    where a.status = 'published'
      and a.email <> ''
      and lower(a.art_form) = lower(v_art_form)
      and lower(a.city) = lower(v_city);
end;
$$;

revoke all on function public.get_job_notification_targets(uuid) from public;
grant execute on function public.get_job_notification_targets(uuid) to authenticated;

-- The artist to notify (with the client's display name) when a message
-- turns out to be the first one in its conversation AND it was sent by
-- the client — never on later messages, and never when the artist
-- messaged first. Callable only by a participant of that conversation.
create or replace function public.get_first_message_email_target(p_conversation_id uuid, p_message_id uuid)
returns table (to_email text, to_name text, from_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist_id uuid;
  v_client_id uuid;
  v_message_count int;
  v_sender_id uuid;
begin
  select c.artist_id, c.client_id into v_artist_id, v_client_id
  from public.conversations c
  where c.id = p_conversation_id
    and (c.artist_id = auth.uid() or c.client_id = auth.uid());

  if v_artist_id is null then
    return;
  end if;

  select count(*) into v_message_count
  from public.messages m
  where m.conversation_id = p_conversation_id;

  if v_message_count <> 1 then
    return;
  end if;

  select m.sender_id into v_sender_id
  from public.messages m
  where m.id = p_message_id and m.conversation_id = p_conversation_id;

  if v_sender_id is null or v_sender_id <> v_client_id then
    return;
  end if;

  return query
    select a.email, coalesce(nullif(a.stage_name, ''), nullif(a.full_name, ''), 'there'),
           coalesce(nullif(cl.full_name, ''), 'A client')
    from public.artists a, public.clients cl
    where a.id = v_artist_id and cl.id = v_client_id and a.email <> '';
end;
$$;

revoke all on function public.get_first_message_email_target(uuid, uuid) from public;
grant execute on function public.get_first_message_email_target(uuid, uuid) to authenticated;
