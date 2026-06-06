-- ============================================================
-- TicketBook – Migration 002: Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.artists enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.sport_details enable row level security;
alter table public.event_media enable row level security;
alter table public.setlists enable row level security;
alter table public.friendships enable row level security;
alter table public.event_attendees enable row level security;
alter table public.user_stats enable row level security;
alter table public.achievements enable row level security;
alter table public.reports enable row level security;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if two users are accepted friends
create or replace function public.are_friends(user_a uuid, user_b uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and (
        (requester_id = user_a and addressee_id = user_b) or
        (requester_id = user_b and addressee_id = user_a)
      )
  );
$$;

-- Check if current user can view an event (respects visibility)
create or replace function public.can_view_event(evt public.events)
returns boolean language sql security definer stable as $$
  select case
    when evt.deleted_at is not null then false
    when evt.visibility = 'public' then true
    when evt.user_id = auth.uid() then true
    when evt.visibility = 'friends' then public.are_friends(auth.uid(), evt.user_id)
    else false
  end;
$$;

-- ============================================================
-- USERS POLICIES
-- ============================================================

-- Anyone can read public user profiles
create policy "users: public read"
  on public.users for select
  using (true);

-- Users can only update their own profile
create policy "users: own update"
  on public.users for update
  using (auth.uid() = id);

-- Insert handled by auth trigger (see migration 003)

-- ============================================================
-- ARTISTS POLICIES
-- ============================================================

-- Anyone authenticated can read artists
create policy "artists: authenticated read"
  on public.artists for select
  to authenticated
  using (true);

-- Only service role can insert/update artists (via edge function)
create policy "artists: service insert"
  on public.artists for insert
  to service_role
  with check (true);

create policy "artists: service update"
  on public.artists for update
  to service_role
  using (true);

-- ============================================================
-- VENUES POLICIES
-- ============================================================

-- Anyone authenticated can read venues
create policy "venues: authenticated read"
  on public.venues for select
  to authenticated
  using (true);

-- Authenticated users can create venues
create policy "venues: authenticated insert"
  on public.venues for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Creator or service role can update venues
create policy "venues: creator update"
  on public.venues for update
  to authenticated
  using (auth.uid() = created_by and verified = false);

-- ============================================================
-- EVENTS POLICIES
-- ============================================================

-- Read: respects visibility + soft delete
create policy "events: visibility read"
  on public.events for select
  using (public.can_view_event(events.*));

-- Insert: own events only
create policy "events: own insert"
  on public.events for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Update: own events only
create policy "events: own update"
  on public.events for update
  to authenticated
  using (auth.uid() = user_id);

-- Delete: own events only (soft delete via updated_at trigger)
create policy "events: own delete"
  on public.events for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- SPORT DETAILS POLICIES
-- ============================================================

-- Read: if you can view the parent event
create policy "sport_details: event read"
  on public.sport_details for select
  using (
    exists (
      select 1 from public.events e
      where e.id = sport_details.event_id
        and public.can_view_event(e.*)
    )
  );

-- Insert/update: own events only
create policy "sport_details: own write"
  on public.sport_details for insert
  to authenticated
  with check (
    exists (
      select 1 from public.events e
      where e.id = sport_details.event_id
        and e.user_id = auth.uid()
    )
  );

create policy "sport_details: own update"
  on public.sport_details for update
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = sport_details.event_id
        and e.user_id = auth.uid()
    )
  );

-- ============================================================
-- EVENT MEDIA POLICIES
-- ============================================================

-- Read: approved media on viewable events
create policy "event_media: approved read"
  on public.event_media for select
  using (
    moderation_status = 'approved'
    and exists (
      select 1 from public.events e
      where e.id = event_media.event_id
        and public.can_view_event(e.*)
    )
  );

-- Own user can see their own pending/rejected media too
create policy "event_media: own read all statuses"
  on public.event_media for select
  using (user_id = auth.uid());

-- Insert: own events only
create policy "event_media: own insert"
  on public.event_media for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_media.event_id
        and e.user_id = auth.uid()
    )
  );

-- Delete: own media only
create policy "event_media: own delete"
  on public.event_media for delete
  to authenticated
  using (user_id = auth.uid());

-- Moderation update: service role only
create policy "event_media: service moderation"
  on public.event_media for update
  to service_role
  using (true);

-- ============================================================
-- SETLISTS POLICIES
-- ============================================================

create policy "setlists: event read"
  on public.setlists for select
  using (
    exists (
      select 1 from public.events e
      where e.id = setlists.event_id
        and public.can_view_event(e.*)
    )
  );

create policy "setlists: own write"
  on public.setlists for insert
  to authenticated
  with check (
    exists (
      select 1 from public.events e
      where e.id = setlists.event_id
        and e.user_id = auth.uid()
    )
  );

create policy "setlists: own update"
  on public.setlists for update
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = setlists.event_id
        and e.user_id = auth.uid()
    )
  );

-- ============================================================
-- FRIENDSHIPS POLICIES
-- ============================================================

-- Read: your own friendship records
create policy "friendships: own read"
  on public.friendships for select
  to authenticated
  using (
    requester_id = auth.uid() or
    addressee_id = auth.uid()
  );

-- Insert: you can send a friend request
create policy "friendships: send request"
  on public.friendships for insert
  to authenticated
  with check (requester_id = auth.uid());

-- Update: addressee can accept/decline; either can block
create policy "friendships: respond or block"
  on public.friendships for update
  to authenticated
  using (
    addressee_id = auth.uid() or
    requester_id = auth.uid()
  );

-- Delete: either party can remove the friendship
create policy "friendships: own delete"
  on public.friendships for delete
  to authenticated
  using (
    requester_id = auth.uid() or
    addressee_id = auth.uid()
  );

-- ============================================================
-- EVENT ATTENDEES POLICIES
-- ============================================================

-- Read: visible if the parent event is visible
create policy "attendees: event read"
  on public.event_attendees for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_attendees.event_id
        and public.can_view_event(e.*)
    )
  );

-- Insert: event owner can tag friends
create policy "attendees: owner tag"
  on public.event_attendees for insert
  to authenticated
  with check (
    tagged_by_user_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_attendees.event_id
        and e.user_id = auth.uid()
    )
  );

-- Update: tagged user can confirm/decline their own tag
create policy "attendees: tagged user respond"
  on public.event_attendees for update
  to authenticated
  using (tagged_user_id = auth.uid());

-- Delete: event owner or tagged user can remove tag
create policy "attendees: owner or tagged delete"
  on public.event_attendees for delete
  to authenticated
  using (
    tagged_by_user_id = auth.uid() or
    tagged_user_id = auth.uid()
  );

-- ============================================================
-- USER STATS POLICIES
-- ============================================================

-- Public stats are readable by all authenticated users (leaderboard)
create policy "user_stats: authenticated read"
  on public.user_stats for select
  to authenticated
  using (true);

-- Only service role writes stats (via DB function)
create policy "user_stats: service write"
  on public.user_stats for all
  to service_role
  using (true);

-- ============================================================
-- ACHIEVEMENTS POLICIES
-- ============================================================

create policy "achievements: authenticated read"
  on public.achievements for select
  to authenticated
  using (true);

create policy "achievements: service write"
  on public.achievements for all
  to service_role
  using (true);

-- ============================================================
-- REPORTS POLICIES
-- ============================================================

create policy "reports: own insert"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- Users can see their own reports
create policy "reports: own read"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());

-- Service role handles moderation queue
create policy "reports: service all"
  on public.reports for all
  to service_role
  using (true);
