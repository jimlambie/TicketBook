-- ============================================================
-- TicketBook – Migration 007: Soft-delete RPC
-- ============================================================
-- On React Native, auth.uid() can be NULL in RLS context when
-- the Supabase client hasn't rehydrated its AsyncStorage session
-- yet, causing WITH CHECK to fail even for the event owner.
-- A security definer function bypasses RLS while still enforcing
-- ownership explicitly via auth.uid() in the function body.

create or replace function public.delete_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events
  set deleted_at = now()
  where id = p_event_id
    and user_id = auth.uid()
    and deleted_at is null;

  if not found then
    raise exception 'not_owner'
      using hint = 'Event not found or not owned by current user';
  end if;
end;
$$;
