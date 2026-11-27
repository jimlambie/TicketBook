-- ============================================================
-- TicketBook – Migration 014: stop duplicate achievements
-- ============================================================
-- evaluate_achievements() inserts with
--   on conflict (user_id, type, (metadata->>'key')) do nothing
-- but milestone achievements ('First show', '10 events attended',
-- 'Visited 10 venues', ...) have no 'key' in metadata. NULLs are
-- distinct in a normal unique index, so the conflict never fired and
-- a new copy was inserted every time stats refreshed.
--
-- Fix: make the uniqueness treat NULL keys as equal (Postgres 15+
-- NULLS NOT DISTINCT). The existing ON CONFLICT clauses in
-- evaluate_achievements() infer this index unchanged.

-- 1. Remove duplicates, keeping the earliest award of each.
delete from public.achievements a
using (
  select id,
         row_number() over (
           partition by user_id, type, metadata->>'key'
           order by awarded_at, id
         ) as rn
  from public.achievements
) d
where a.id = d.id
  and d.rn > 1;

-- 2. Replace the old uniqueness with a NULLS NOT DISTINCT index.
alter table public.achievements drop constraint if exists unique_achievement;
drop index if exists public.unique_achievement;

create unique index achievements_user_type_key_unique
  on public.achievements (user_id, type, (metadata->>'key'))
  nulls not distinct;
