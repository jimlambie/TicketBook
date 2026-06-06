-- ============================================================
-- TicketBook – Migration 001: Core Schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- fuzzy search on artist/venue names

-- ============================================================
-- ENUMS
-- ============================================================

create type event_type as enum ('concert', 'sport', 'festival', 'other');
create type visibility as enum ('public', 'friends', 'private');
create type media_type as enum ('ticket', 'photo', 'video', 'setlist', 'document');
create type moderation_status as enum ('pending', 'approved', 'rejected');
create type friendship_status as enum ('pending', 'accepted', 'blocked');
create type attendee_status as enum ('pending', 'confirmed', 'declined');
create type setlist_source as enum ('user_upload', 'setlist_fm', 'manual');
create type plan_type as enum ('free', 'premium');

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================

create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text not null unique,
  display_name    text,
  avatar_url      text,
  bio             text,
  plan            plan_type not null default 'free',
  privacy_default visibility not null default 'friends',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint username_length check (char_length(username) between 3 and 30),
  constraint username_format check (username ~ '^[a-z0-9_]+$')
);

-- Index for username lookup (friend search)
create index idx_users_username on public.users using gin (username gin_trgm_ops);

-- ============================================================
-- ARTISTS (canonical lookup table)
-- ============================================================

create table public.artists (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  slug            text not null unique,  -- url-safe, e.g. "pearl-jam"
  spotify_id      text unique,
  musicbrainz_id  text unique,
  genre           text,
  image_url       text,
  aliases         text[] default '{}',   -- alternate names for search matching
  created_at      timestamptz not null default now()
);

create index idx_artists_name on public.artists using gin (name gin_trgm_ops);
create index idx_artists_slug on public.artists (slug);

-- ============================================================
-- VENUES
-- ============================================================

create table public.venues (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  slug            text not null unique,
  city            text not null,
  country         text not null,
  country_code    char(2),              -- ISO 3166-1 alpha-2
  lat             numeric(9,6),
  lng             numeric(9,6),
  capacity        integer,
  created_by      uuid references public.users(id) on delete set null,
  verified        boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_venues_name on public.venues using gin (name gin_trgm_ops);
create index idx_venues_city on public.venues (country_code, city);

-- ============================================================
-- EVENTS
-- ============================================================

create table public.events (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  type            event_type not null default 'concert',
  title           text not null,          -- display title, e.g. "Pearl Jam – Spark Arena"
  artist_id       uuid references public.artists(id) on delete set null,
  artist_name     text,                   -- fallback if no canonical match yet
  venue_id        uuid references public.venues(id) on delete set null,
  venue_name      text,                   -- fallback if no canonical match yet
  event_date      date not null,
  city            text,
  country_code    char(2),
  visibility      visibility not null default 'friends',
  rating          smallint check (rating between 1 and 10),
  review_text     text,
  notes           text,                   -- private journal field
  stub_number     integer,               -- sequential per user, e.g. #0042
  deleted_at      timestamptz,           -- soft delete
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_events_user_id on public.events (user_id);
create index idx_events_artist_id on public.events (artist_id);
create index idx_events_venue_id on public.events (venue_id);
create index idx_events_date on public.events (event_date desc);
create index idx_events_deleted on public.events (deleted_at) where deleted_at is null;

-- Auto-assign stub number per user
create sequence if not exists stub_number_seq;

create or replace function assign_stub_number()
returns trigger language plpgsql as $$
begin
  if new.stub_number is null then
    new.stub_number := (
      select coalesce(max(stub_number), 0) + 1
      from public.events
      where user_id = new.user_id
        and deleted_at is null
    );
  end if;
  return new;
end;
$$;

create trigger trg_assign_stub_number
  before insert on public.events
  for each row execute function assign_stub_number();

-- ============================================================
-- SPORT DETAILS (extension table for sport events)
-- ============================================================

create table public.sport_details (
  id              uuid primary key default uuid_generate_v4(),
  event_id        uuid not null unique references public.events(id) on delete cascade,
  home_team       text,
  away_team       text,
  home_score      smallint,
  away_score      smallint,
  competition     text,                   -- "Super Rugby Pacific", "NRL", "EPL"
  season          text,                   -- "2025", "2024/25"
  lineups         jsonb default '{}',     -- flexible, per sport
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- EVENT MEDIA
-- ============================================================

create table public.event_media (
  id                  uuid primary key default uuid_generate_v4(),
  event_id            uuid not null references public.events(id) on delete cascade,
  user_id             uuid not null references public.users(id) on delete cascade,
  type                media_type not null,
  storage_path        text not null,      -- path in Supabase Storage bucket
  thumbnail_path      text,
  file_size_bytes     integer,
  mime_type           text,
  ocr_extracted_text  text,              -- raw OCR output if scanned
  moderation_status   moderation_status not null default 'pending',
  moderation_reason   text,             -- populated on rejection
  sort_order          smallint default 0,
  created_at          timestamptz not null default now()
);

create index idx_event_media_event_id on public.event_media (event_id);
create index idx_event_media_moderation on public.event_media (moderation_status)
  where moderation_status = 'pending';

-- ============================================================
-- SETLISTS
-- ============================================================

create table public.setlists (
  id              uuid primary key default uuid_generate_v4(),
  event_id        uuid not null unique references public.events(id) on delete cascade,
  source          setlist_source not null default 'manual',
  setlist_fm_id   text,
  songs           jsonb not null default '[]', -- [{position, title, note, encore}]
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================

create table public.friendships (
  id              uuid primary key default uuid_generate_v4(),
  requester_id    uuid not null references public.users(id) on delete cascade,
  addressee_id    uuid not null references public.users(id) on delete cascade,
  status          friendship_status not null default 'pending',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint no_self_friend check (requester_id != addressee_id),
  constraint unique_friendship unique (
    least(requester_id::text, addressee_id::text),
    greatest(requester_id::text, addressee_id::text)
  )
);

create index idx_friendships_requester on public.friendships (requester_id, status);
create index idx_friendships_addressee on public.friendships (addressee_id, status);

-- Helper view: all accepted friendships, both directions
create view public.accepted_friends as
  select requester_id as user_id, addressee_id as friend_id
  from public.friendships where status = 'accepted'
  union all
  select addressee_id as user_id, requester_id as friend_id
  from public.friendships where status = 'accepted';

-- ============================================================
-- EVENT ATTENDEES (tagging)
-- ============================================================

create table public.event_attendees (
  id                  uuid primary key default uuid_generate_v4(),
  event_id            uuid not null references public.events(id) on delete cascade,
  tagged_by_user_id   uuid not null references public.users(id) on delete cascade,
  tagged_user_id      uuid not null references public.users(id) on delete cascade,
  status              attendee_status not null default 'pending',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint no_self_tag check (tagged_by_user_id != tagged_user_id),
  constraint unique_attendee unique (event_id, tagged_user_id)
);

create index idx_attendees_event_id on public.event_attendees (event_id);
create index idx_attendees_tagged_user on public.event_attendees (tagged_user_id, status);

-- ============================================================
-- USER STATS (materialised for leaderboard performance)
-- ============================================================

create table public.user_stats (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  dimension       text not null,  -- 'artist', 'venue', 'event_type', 'total'
  key             text not null,  -- artist slug, venue slug, event type, or 'all'
  label           text not null,  -- display name
  count           integer not null default 0,
  last_event_date date,
  updated_at      timestamptz not null default now(),

  constraint unique_user_stat unique (user_id, dimension, key)
);

create index idx_user_stats_user_id on public.user_stats (user_id, dimension);
create index idx_user_stats_leaderboard on public.user_stats (dimension, key, count desc)
  where dimension in ('artist', 'venue', 'total');

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================

create table public.achievements (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  type            text not null,      -- 'first_event', 'superfan_10', 'venue_hopper', etc.
  label           text not null,
  metadata        jsonb default '{}', -- e.g. { artist: "Pearl Jam", count: 10 }
  awarded_at      timestamptz not null default now(),

  constraint unique_achievement unique (user_id, type, (metadata->>'key'))
);

create index idx_achievements_user_id on public.achievements (user_id);

-- ============================================================
-- REPORTS (moderation)
-- ============================================================

create table public.reports (
  id              uuid primary key default uuid_generate_v4(),
  reporter_id     uuid not null references public.users(id) on delete cascade,
  target_type     text not null,          -- 'event', 'media', 'user'
  target_id       uuid not null,
  reason          text not null,
  resolved        boolean not null default false,
  resolved_by     uuid references public.users(id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_reports_unresolved on public.reports (created_at)
  where resolved = false;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function update_updated_at();

create trigger trg_events_updated_at
  before update on public.events
  for each row execute function update_updated_at();

create trigger trg_sport_details_updated_at
  before update on public.sport_details
  for each row execute function update_updated_at();

create trigger trg_setlists_updated_at
  before update on public.setlists
  for each row execute function update_updated_at();

create trigger trg_friendships_updated_at
  before update on public.friendships
  for each row execute function update_updated_at();

create trigger trg_attendees_updated_at
  before update on public.event_attendees
  for each row execute function update_updated_at();
