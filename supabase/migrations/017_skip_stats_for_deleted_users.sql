-- ============================================================
-- TicketBook – Migration 017: don't refresh stats for deleted users
-- ============================================================
-- Deleting an account cascades auth.users → public.users → events.
-- Each cascaded event delete fires trg_events_refresh_stats, and
-- refresh_user_stats() always inserts a 'total' row, even for 0
-- events. By then the public.users row is gone, so that insert
-- violates user_stats_user_id_fkey and the whole delete rolls back.
--
-- Skip the refresh when the user no longer exists.

create or replace function public.trg_refresh_stats_fn()
returns trigger language plpgsql security definer as $$
declare
  v_user_id uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
begin
  if exists (select 1 from public.users where id = v_user_id) then
    perform public.refresh_user_stats(v_user_id);
  end if;
  return coalesce(new, old);
end;
$$;
