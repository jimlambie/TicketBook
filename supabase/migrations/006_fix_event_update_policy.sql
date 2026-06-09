-- ============================================================
-- TicketBook – Migration 006: Fix event update RLS policy
-- ============================================================
-- The original "events: own update" policy had a USING clause
-- but no WITH CHECK. Soft-delete (UPDATE SET deleted_at) and
-- field edits both need the explicit WITH CHECK so Supabase
-- doesn't reject the post-update row check.

drop policy if exists "events: own update" on public.events;

create policy "events: own update"
  on public.events for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
