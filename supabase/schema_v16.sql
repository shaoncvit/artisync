-- Run this in the Supabase SQL Editor AFTER schema_v15.sql.
--
-- Bugfix: list_my_conversations() has always errored — its RETURNS TABLE
-- declares an OUT parameter named `conversation_id`, and the "last
-- message" lateral subquery referenced `conversation_id = c.id` without
-- qualifying which table it meant. Postgres can't tell whether that's the
-- OUT parameter or messages.conversation_id, so every call failed with
-- "column reference conversation_id is ambiguous" (42702) — the frontend
-- swallows the RPC error and just renders an empty chat bar, which is why
-- it always showed "No messages yet" even with real conversations and
-- messages sitting in the database. Fix: qualify it.
create or replace function public.list_my_conversations()
returns table (
  conversation_id uuid,
  partner_id uuid,
  partner_name text,
  partner_photo text,
  status text,
  last_message_body text,
  last_message_at timestamptz,
  unread_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select
    c.id,
    p.partner_id,
    coalesce(nullif(pa.stage_name, ''), nullif(pa.full_name, ''), nullif(pc.full_name, ''), 'User'),
    coalesce(pa.profile_picture_url, ''::text),
    c.status,
    lm.body,
    coalesce(lm.created_at, c.created_at),
    (
      select count(*) from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > (case when c.artist_id = auth.uid() then c.artist_last_read_at else c.client_last_read_at end)
    )
  from public.conversations c
  cross join lateral (select case when c.artist_id = auth.uid() then c.client_id else c.artist_id end as partner_id) p
  left join public.artists pa on pa.id = p.partner_id
  left join public.clients pc on pc.id = p.partner_id
  left join lateral (
    select m2.body, m2.created_at from public.messages m2
    where m2.conversation_id = c.id
    order by m2.created_at desc
    limit 1
  ) lm on true
  where c.artist_id = auth.uid() or c.client_id = auth.uid()
  order by coalesce(lm.created_at, c.created_at) desc;
end;
$$;
