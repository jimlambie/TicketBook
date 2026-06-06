-- ============================================================
-- TicketBook – Migration 003: Auth Trigger, Stats & Achievements
-- ============================================================

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, username, display_name, avatar_url)
  values (
    new.id,
    -- Derive a temporary username from email prefix; user updates on onboarding
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g')),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- STATS MATERIALISATION
-- Runs after every event insert/update/delete
-- ============================================================

create or replace function public.refresh_user_stats(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_event record;
begin
  -- Clear existing stats for this user
  delete from public.user_stats where user_id = p_user_id;

  -- Total events
  insert into public.user_stats (user_id, dimension, key, label, count, last_event_date)
  select
    p_user_id,
    'total',
    'all',
    'Total events',
    count(*),
    max(event_date)
  from public.events
  where user_id = p_user_id and deleted_at is null;

  -- By artist (requires artist_id or falls back to artist_name)
  insert into public.user_stats (user_id, dimension, key, label, count, last_event_date)
  select
    p_user_id,
    'artist',
    coalesce(a.slug, lower(regexp_replace(e.artist_name, '\s+', '-', 'g'))),
    coalesce(a.name, e.artist_name),
    count(*),
    max(e.event_date)
  from public.events e
  left join public.artists a on a.id = e.artist_id
  where e.user_id = p_user_id
    and e.deleted_at is null
    and (e.artist_id is not null or e.artist_name is not null)
    and e.type in ('concert', 'festival')
  group by a.slug, e.artist_name, a.name
  on conflict (user_id, dimension, key) do update
    set count = excluded.count,
        last_event_date = excluded.last_event_date,
        updated_at = now();

  -- By venue
  insert into public.user_stats (user_id, dimension, key, label, count, last_event_date)
  select
    p_user_id,
    'venue',
    coalesce(v.slug, lower(regexp_replace(e.venue_name, '\s+', '-', 'g'))),
    coalesce(v.name, e.venue_name),
    count(*),
    max(e.event_date)
  from public.events e
  left join public.venues v on v.id = e.venue_id
  where e.user_id = p_user_id
    and e.deleted_at is null
    and (e.venue_id is not null or e.venue_name is not null)
  group by v.slug, e.venue_name, v.name
  on conflict (user_id, dimension, key) do update
    set count = excluded.count,
        last_event_date = excluded.last_event_date,
        updated_at = now();

  -- By event type
  insert into public.user_stats (user_id, dimension, key, label, count, last_event_date)
  select
    p_user_id,
    'event_type',
    type::text,
    initcap(type::text),
    count(*),
    max(event_date)
  from public.events
  where user_id = p_user_id and deleted_at is null
  group by type
  on conflict (user_id, dimension, key) do update
    set count = excluded.count,
        last_event_date = excluded.last_event_date,
        updated_at = now();

end;
$$;

-- Trigger: refresh stats after any event change
create or replace function public.trg_refresh_stats_fn()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_user_stats(old.user_id);
  else
    perform public.refresh_user_stats(new.user_id);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_events_refresh_stats
  after insert or update or delete on public.events
  for each row execute function public.trg_refresh_stats_fn();

-- ============================================================
-- ACHIEVEMENTS ENGINE
-- Called after stats refresh
-- ============================================================

create or replace function public.evaluate_achievements(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_total integer;
  v_stat record;
begin
  -- Get total event count
  select count into v_total
  from public.user_stats
  where user_id = p_user_id and dimension = 'total' and key = 'all';

  -- First event
  if v_total >= 1 then
    insert into public.achievements (user_id, type, label, metadata)
    values (p_user_id, 'first_event', 'First show', '{}')
    on conflict (user_id, type, (metadata->>'key')) do nothing;
  end if;

  -- Milestone events: 10, 25, 50, 100, 250, 500
  if v_total >= 10 then
    insert into public.achievements (user_id, type, label, metadata)
    values (p_user_id, 'events_10', '10 events attended', '{"milestone": 10}')
    on conflict (user_id, type, (metadata->>'key')) do nothing;
  end if;

  if v_total >= 25 then
    insert into public.achievements (user_id, type, label, metadata)
    values (p_user_id, 'events_25', '25 events attended', '{"milestone": 25}')
    on conflict (user_id, type, (metadata->>'key')) do nothing;
  end if;

  if v_total >= 50 then
    insert into public.achievements (user_id, type, label, metadata)
    values (p_user_id, 'events_50', '50 events attended', '{"milestone": 50}')
    on conflict (user_id, type, (metadata->>'key')) do nothing;
  end if;

  if v_total >= 100 then
    insert into public.achievements (user_id, type, label, metadata)
    values (p_user_id, 'events_100', 'Century club', '{"milestone": 100}')
    on conflict (user_id, type, (metadata->>'key')) do nothing;
  end if;

  -- Superfan: seen same artist 5, 10, 25 times
  for v_stat in
    select key, label, count
    from public.user_stats
    where user_id = p_user_id and dimension = 'artist' and count >= 5
  loop
    if v_stat.count >= 5 then
      insert into public.achievements (user_id, type, label, metadata)
      values (
        p_user_id,
        'superfan_5',
        'Seen ' || v_stat.label || ' 5 times',
        jsonb_build_object('key', v_stat.key, 'artist', v_stat.label, 'count', v_stat.count)
      )
      on conflict (user_id, type, (metadata->>'key')) do nothing;
    end if;

    if v_stat.count >= 10 then
      insert into public.achievements (user_id, type, label, metadata)
      values (
        p_user_id,
        'superfan_10',
        'Seen ' || v_stat.label || ' 10 times',
        jsonb_build_object('key', v_stat.key, 'artist', v_stat.label, 'count', v_stat.count)
      )
      on conflict (user_id, type, (metadata->>'key')) do nothing;
    end if;

    if v_stat.count >= 25 then
      insert into public.achievements (user_id, type, label, metadata)
      values (
        p_user_id,
        'superfan_25',
        'Seen ' || v_stat.label || ' 25 times',
        jsonb_build_object('key', v_stat.key, 'artist', v_stat.label, 'count', v_stat.count)
      )
      on conflict (user_id, type, (metadata->>'key')) do nothing;
    end if;
  end loop;

  -- Venue hopper: 10+ distinct venues
  declare
    v_venue_count integer;
  begin
    select count(distinct key) into v_venue_count
    from public.user_stats
    where user_id = p_user_id and dimension = 'venue';

    if v_venue_count >= 10 then
      insert into public.achievements (user_id, type, label, metadata)
      values (p_user_id, 'venue_hopper_10', 'Visited 10 venues', '{"milestone": 10}')
      on conflict (user_id, type, (metadata->>'key')) do nothing;
    end if;

    if v_venue_count >= 25 then
      insert into public.achievements (user_id, type, label, metadata)
      values (p_user_id, 'venue_hopper_25', 'Visited 25 venues', '{"milestone": 25}')
      on conflict (user_id, type, (metadata->>'key')) do nothing;
    end if;
  end;

end;
$$;

-- Wire achievements to stats trigger
create or replace function public.trg_achievements_fn()
returns trigger language plpgsql security definer as $$
begin
  perform public.evaluate_achievements(new.user_id);
  return new;
end;
$$;

create trigger trg_user_stats_achievements
  after insert or update on public.user_stats
  for each row
  when (new.dimension = 'total' and new.key = 'all')
  execute function public.trg_achievements_fn();

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Feed view: events with joined artist/venue names, for easy querying
create view public.events_feed as
  select
    e.*,
    a.name as artist_canonical_name,
    a.slug as artist_slug,
    a.image_url as artist_image_url,
    v.name as venue_canonical_name,
    v.slug as venue_slug,
    v.city as venue_city,
    v.country_code as venue_country_code,
    -- Attendee count (confirmed only)
    (
      select count(*) from public.event_attendees ea
      where ea.event_id = e.id and ea.status = 'confirmed'
    ) as attendee_count
  from public.events e
  left join public.artists a on a.id = e.artist_id
  left join public.venues v on v.id = e.venue_id
  where e.deleted_at is null;

-- Leaderboard view: top users per artist
create view public.leaderboard_by_artist as
  select
    us.user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    us.key as artist_slug,
    us.label as artist_name,
    us.count,
    us.last_event_date
  from public.user_stats us
  join public.users u on u.id = us.user_id
  where us.dimension = 'artist'
  order by us.key, us.count desc;

-- Leaderboard view: top users by total events
create view public.leaderboard_total as
  select
    us.user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    us.count as total_events,
    us.last_event_date,
    rank() over (order by us.count desc) as rank
  from public.user_stats us
  join public.users u on u.id = us.user_id
  where us.dimension = 'total' and us.key = 'all'
  order by us.count desc;
