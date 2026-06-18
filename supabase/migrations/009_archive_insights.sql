-- ============================================================
-- TicketBook – Migration 009: Archive Insights & Year in Review
-- ============================================================
-- Two read-only RPCs for Collector-tier "deep stats" features.
-- Both use auth.uid() directly (security definer, same pattern
-- as migration 007) so the client never passes a user id.

-- ============================================================
-- ARCHIVE INSIGHTS (all-time)
-- ============================================================

create or replace function public.get_archive_insights()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_total int;
  v_years int[];
  v_gap_from date;
  v_gap_to date;
  v_gap_days int;
  v_streak_artist text;
  v_streak_start int;
  v_streak_end int;
  v_streak_len int;
  v_busiest_month text;
  v_busiest_month_num int;
  v_busiest_month_count int;
  v_hr_title text;
  v_hr_artist text;
  v_hr_venue text;
  v_hr_rating smallint;
  v_hr_date date;
  v_cities int;
  v_countries int;
begin
  select count(*)::int into v_total
  from public.events
  where user_id = v_user_id and deleted_at is null;

  select array_agg(distinct extract(year from event_date)::int order by extract(year from event_date)::int desc)
  into v_years
  from public.events
  where user_id = v_user_id and deleted_at is null;

  -- Longest gap between consecutive shows
  with ordered as (
    select
      event_date,
      lag(event_date) over (order by event_date) as prev_date
    from public.events
    where user_id = v_user_id and deleted_at is null
  )
  select prev_date, event_date, (event_date - prev_date)::int
  into v_gap_from, v_gap_to, v_gap_days
  from ordered
  where prev_date is not null
  order by (event_date - prev_date) desc, event_date desc
  limit 1;

  -- Longest consecutive-year streak for a single artist
  with artist_years as (
    select
      coalesce(a.slug, lower(regexp_replace(e.artist_name, '\s+', '-', 'g'))) as artist_key,
      coalesce(a.name, e.artist_name) as artist_label,
      extract(year from e.event_date)::int as yr
    from public.events e
    left join public.artists a on a.id = e.artist_id
    where e.user_id = v_user_id
      and e.deleted_at is null
      and e.type in ('concert', 'festival')
      and (e.artist_id is not null or e.artist_name is not null)
    group by artist_key, artist_label, yr
  ),
  grouped as (
    select
      artist_key, artist_label, yr,
      yr - (row_number() over (partition by artist_key order by yr))::int as grp
    from artist_years
  ),
  runs as (
    select artist_key, artist_label, min(yr) as start_year, max(yr) as end_year, count(*)::int as streak_len
    from grouped
    group by artist_key, artist_label, grp
  )
  select artist_label, start_year, end_year, streak_len
  into v_streak_artist, v_streak_start, v_streak_end, v_streak_len
  from runs
  where streak_len >= 2
  order by streak_len desc, end_year desc
  limit 1;

  -- Busiest month of the year (across all years)
  select trim(to_char(event_date, 'Month')), extract(month from event_date)::int, count(*)::int
  into v_busiest_month, v_busiest_month_num, v_busiest_month_count
  from public.events
  where user_id = v_user_id and deleted_at is null
  group by trim(to_char(event_date, 'Month')), extract(month from event_date)::int
  order by count(*) desc, extract(month from event_date)::int asc
  limit 1;

  -- Highest-rated show ever
  select e.title, coalesce(a.name, e.artist_name), coalesce(v.name, e.venue_name), e.rating, e.event_date
  into v_hr_title, v_hr_artist, v_hr_venue, v_hr_rating, v_hr_date
  from public.events e
  left join public.artists a on a.id = e.artist_id
  left join public.venues v on v.id = e.venue_id
  where e.user_id = v_user_id and e.deleted_at is null and e.rating is not null
  order by e.rating desc, e.event_date desc
  limit 1;

  -- Distinct cities / countries
  select count(distinct coalesce(v.city, e.city)), count(distinct coalesce(v.country_code, e.country_code))
  into v_cities, v_countries
  from public.events e
  left join public.venues v on v.id = e.venue_id
  where e.user_id = v_user_id and e.deleted_at is null;

  return jsonb_build_object(
    'total_shows', v_total,
    'years_active', coalesce(to_jsonb(v_years), '[]'::jsonb),
    'longest_gap', case when v_gap_days is not null then jsonb_build_object(
      'days', v_gap_days, 'from_date', v_gap_from, 'to_date', v_gap_to
    ) else null end,
    'artist_streak', case when v_streak_artist is not null then jsonb_build_object(
      'artist_name', v_streak_artist, 'start_year', v_streak_start, 'end_year', v_streak_end, 'length', v_streak_len
    ) else null end,
    'busiest_month', case when v_busiest_month is not null then jsonb_build_object(
      'month', v_busiest_month, 'month_num', v_busiest_month_num, 'count', v_busiest_month_count
    ) else null end,
    'highest_rated_show', case when v_hr_title is not null then jsonb_build_object(
      'title', v_hr_title, 'artist_name', v_hr_artist, 'venue_name', v_hr_venue, 'rating', v_hr_rating, 'event_date', v_hr_date
    ) else null end,
    'cities_count', v_cities,
    'countries_count', v_countries
  );
end;
$$;

-- ============================================================
-- YEAR IN REVIEW (per calendar year)
-- ============================================================

create or replace function public.get_year_in_review(p_year integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_years int[];
  v_year int;
  v_total int;
  v_prev_total int;
  v_top_artist_name text;
  v_top_artist_count int;
  v_top_venue_name text;
  v_top_venue_count int;
  v_hr_title text;
  v_hr_artist text;
  v_hr_venue text;
  v_hr_rating smallint;
  v_hr_date date;
begin
  select array_agg(distinct extract(year from event_date)::int order by extract(year from event_date)::int desc)
  into v_years
  from public.events
  where user_id = v_user_id and deleted_at is null;

  if v_years is null then
    return jsonb_build_object('year', null, 'years_active', '[]'::jsonb);
  end if;

  v_year := coalesce(p_year, v_years[1]);

  select count(*)::int into v_total
  from public.events
  where user_id = v_user_id and deleted_at is null
    and extract(year from event_date)::int = v_year;

  select count(*)::int into v_prev_total
  from public.events
  where user_id = v_user_id and deleted_at is null
    and extract(year from event_date)::int = v_year - 1;

  select coalesce(a.name, e.artist_name), count(*)::int
  into v_top_artist_name, v_top_artist_count
  from public.events e
  left join public.artists a on a.id = e.artist_id
  where e.user_id = v_user_id and e.deleted_at is null
    and extract(year from e.event_date)::int = v_year
    and (e.artist_id is not null or e.artist_name is not null)
    and e.type in ('concert', 'festival')
  group by coalesce(a.name, e.artist_name)
  order by count(*) desc
  limit 1;

  select coalesce(v.name, e.venue_name), count(*)::int
  into v_top_venue_name, v_top_venue_count
  from public.events e
  left join public.venues v on v.id = e.venue_id
  where e.user_id = v_user_id and e.deleted_at is null
    and extract(year from e.event_date)::int = v_year
    and (e.venue_id is not null or e.venue_name is not null)
  group by coalesce(v.name, e.venue_name)
  order by count(*) desc
  limit 1;

  select e.title, coalesce(a.name, e.artist_name), coalesce(v.name, e.venue_name), e.rating, e.event_date
  into v_hr_title, v_hr_artist, v_hr_venue, v_hr_rating, v_hr_date
  from public.events e
  left join public.artists a on a.id = e.artist_id
  left join public.venues v on v.id = e.venue_id
  where e.user_id = v_user_id and e.deleted_at is null
    and extract(year from e.event_date)::int = v_year
    and e.rating is not null
  order by e.rating desc, e.event_date desc
  limit 1;

  return jsonb_build_object(
    'year', v_year,
    'years_active', to_jsonb(v_years),
    'total_shows', v_total,
    'prev_year_total', v_prev_total,
    'top_artist', case when v_top_artist_name is not null then jsonb_build_object('name', v_top_artist_name, 'count', v_top_artist_count) else null end,
    'top_venue', case when v_top_venue_name is not null then jsonb_build_object('name', v_top_venue_name, 'count', v_top_venue_count) else null end,
    'highest_rated_show', case when v_hr_title is not null then jsonb_build_object(
      'title', v_hr_title, 'artist_name', v_hr_artist, 'venue_name', v_hr_venue, 'rating', v_hr_rating, 'event_date', v_hr_date
    ) else null end
  );
end;
$$;
