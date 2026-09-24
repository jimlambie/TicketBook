-- ============================================================
-- TicketBook – Migration 010: Private event notes
-- ============================================================
-- events.notes was meant to be a private journal field, but RLS
-- is row-level: anyone who could view an event (friends/public)
-- could read its notes, and events_feed exposed them via e.*.
-- Notes move to their own owner-only table. Reads and writes go
-- through security definer RPCs (same pattern as migration 007)
-- so auth.uid() is enforced explicitly in the function body.

-- ============================================================
-- TABLE
-- ============================================================

create table public.event_notes (
  event_id    uuid primary key references public.events(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  notes       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_event_notes_updated_at
  before update on public.event_notes
  for each row execute function update_updated_at();

alter table public.event_notes enable row level security;

-- Owner-only read. No insert/update/delete policies: writes go
-- through set_event_notes().
create policy "event_notes: own read"
  on public.event_notes for select
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- MOVE EXISTING NOTES
-- ============================================================

insert into public.event_notes (event_id, user_id, notes)
select id, user_id, notes
from public.events
where notes is not null
  and btrim(notes) <> '';

-- events_feed selects e.*, which pins the column; recreate it
-- after dropping notes (definition unchanged from migration 003).
drop view public.events_feed;

alter table public.events drop column notes;

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

-- ============================================================
-- RPCS
-- ============================================================

create or replace function public.get_event_notes(p_event_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select notes
  from public.event_notes
  where event_id = p_event_id
    and user_id = auth.uid();
$$;

-- Upserts the note; an empty/blank note deletes it.
create or replace function public.set_event_notes(p_event_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not exists (
    select 1 from public.events
    where id = p_event_id
      and user_id = v_user_id
      and deleted_at is null
  ) then
    raise exception 'not_owner'
      using hint = 'Event not found or not owned by current user';
  end if;

  if p_notes is null or btrim(p_notes) = '' then
    delete from public.event_notes where event_id = p_event_id;
  else
    insert into public.event_notes (event_id, user_id, notes)
    values (p_event_id, v_user_id, btrim(p_notes))
    on conflict (event_id) do update set notes = excluded.notes;
  end if;
end;
$$;
