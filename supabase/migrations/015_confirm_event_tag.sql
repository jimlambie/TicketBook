-- ============================================================
-- TicketBook – Migration 015: confirming a tag adds the event
-- ============================================================
-- 1. Tagged users can view the event they were tagged on, even if it's
--    private, so they can open it from the notification and respond.
-- 2. events.source_event_id links a copied stub back to the event it
--    was created from.
-- 3. confirm_event_tag() confirms a pending tag and, unless the user
--    already logged the same event, adds a copy to their archive.

-- ------------------------------------------------------------
-- 1. Visibility for tagged users
-- ------------------------------------------------------------
create or replace function public.can_view_event(evt public.events)
returns boolean language sql security definer stable as $$
  select case
    when evt.deleted_at is not null then false
    when evt.visibility = 'public' then true
    when evt.user_id = auth.uid() then true
    when exists (
      select 1 from public.event_attendees ea
      where ea.event_id = evt.id
        and ea.tagged_user_id = auth.uid()
        and ea.status <> 'declined'
    ) then true
    when evt.visibility = 'friends' then public.are_friends(auth.uid(), evt.user_id)
    else false
  end;
$$;

-- ------------------------------------------------------------
-- 2. Link copied stubs to their source
-- ------------------------------------------------------------
-- Not added to events_feed: recreating that view would drop its
-- security_invoker option (see migration 011), and nothing reads it yet.
alter table public.events
  add column if not exists source_event_id uuid
    references public.events(id) on delete set null;

create index if not exists idx_events_source_event_id
  on public.events (source_event_id)
  where source_event_id is not null;

-- ------------------------------------------------------------
-- 3. Confirm a tag
-- ------------------------------------------------------------
-- Returns the id of the caller's own stub for this event (newly created
-- or already existing). security definer: inserting into events on
-- behalf of the caller is restricted to auth.uid() in the body.
create or replace function public.confirm_event_tag(p_attendee_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid        uuid := auth.uid();
  v_attendee   public.event_attendees%rowtype;
  v_src        public.events%rowtype;
  v_own_id     uuid;
  v_visibility public.visibility;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_attendee
  from public.event_attendees
  where id = p_attendee_id and tagged_user_id = v_uid
  for update;

  if not found then
    raise exception 'tag_not_found';
  end if;
  if v_attendee.status = 'declined' then
    raise exception 'tag_declined';
  end if;

  select * into v_src
  from public.events
  where id = v_attendee.event_id and deleted_at is null;

  if not found then
    raise exception 'event_not_found';
  end if;

  update public.event_attendees
  set status = 'confirmed'
  where id = p_attendee_id and status = 'pending';

  -- Already logged? Same date and the same artist, venue or title, or
  -- previously copied from this event.
  select e.id into v_own_id
  from public.events e
  where e.user_id = v_uid
    and e.deleted_at is null
    and (
      e.source_event_id = v_src.id
      or (
        e.event_date = v_src.event_date
        and (
          (v_src.artist_id is not null and e.artist_id = v_src.artist_id)
          or (v_src.venue_id is not null and e.venue_id = v_src.venue_id)
          or lower(e.title) = lower(v_src.title)
        )
      )
    )
  order by e.created_at
  limit 1;

  if v_own_id is not null then
    return v_own_id;
  end if;

  select privacy_default into v_visibility
  from public.users where id = v_uid;

  -- Copy the shared facts only: no rating, review, notes or media.
  insert into public.events (
    user_id, type, title, artist_id, artist_name, venue_id, venue_name,
    event_date, city, country_code, visibility, source_event_id
  )
  values (
    v_uid, v_src.type, v_src.title, v_src.artist_id, v_src.artist_name,
    v_src.venue_id, v_src.venue_name, v_src.event_date, v_src.city,
    v_src.country_code, coalesce(v_visibility, 'friends'), v_src.id
  )
  returning id into v_own_id;

  insert into public.sport_details (
    event_id, home_team, away_team, home_score, away_score,
    competition, season, lineups
  )
  select v_own_id, home_team, away_team, home_score, away_score,
         competition, season, lineups
  from public.sport_details
  where event_id = v_src.id;

  return v_own_id;
end;
$$;

revoke all on function public.confirm_event_tag(uuid) from public;
grant execute on function public.confirm_event_tag(uuid) to authenticated;
