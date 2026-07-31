-- Run this in the Supabase SQL Editor AFTER schema_v24.sql.
--
-- Message notifications now fire for every message, both directions
-- (client -> artist and artist -> client), not just a client's first
-- message to an artist. Replaces get_first_message_email_target with a
-- more general get_message_email_target: same security-definer pattern
-- (caller must be a participant of the conversation), but the recipient
-- is simply "whichever side didn't send this message" and there's no
-- message-count restriction anymore.

create or replace function public.get_message_email_target(p_conversation_id uuid, p_message_id uuid)
returns table (to_email text, to_name text, from_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist_id uuid;
  v_client_id uuid;
  v_sender_id uuid;
  v_recipient_is_artist boolean;
begin
  select c.artist_id, c.client_id into v_artist_id, v_client_id
  from public.conversations c
  where c.id = p_conversation_id
    and (c.artist_id = auth.uid() or c.client_id = auth.uid());

  if v_artist_id is null then
    return;
  end if;

  select m.sender_id into v_sender_id
  from public.messages m
  where m.id = p_message_id and m.conversation_id = p_conversation_id;

  if v_sender_id is null then
    return;
  end if;

  v_recipient_is_artist := (v_sender_id <> v_artist_id);

  return query
    select
      case when v_recipient_is_artist then a.email else cl.email end,
      case when v_recipient_is_artist then coalesce(nullif(a.stage_name, ''), nullif(a.full_name, ''), 'there') else coalesce(nullif(cl.full_name, ''), 'there') end,
      case when v_recipient_is_artist then coalesce(nullif(cl.full_name, ''), 'A client') else coalesce(nullif(a.stage_name, ''), nullif(a.full_name, ''), 'An artist') end
    from public.artists a, public.clients cl
    where a.id = v_artist_id and cl.id = v_client_id
      and case when v_recipient_is_artist then a.email <> '' else cl.email <> '' end;
end;
$$;

revoke all on function public.get_message_email_target(uuid, uuid) from public;
grant execute on function public.get_message_email_target(uuid, uuid) to authenticated;

drop function if exists public.get_first_message_email_target(uuid, uuid);
