-- ============================================================
-- TicketBook – Migration 011: events_feed respects RLS
-- ============================================================
-- Views run with their owner's privileges by default, so
-- events_feed bypassed the "events: visibility read" policy and
-- exposed private/friends-only events to any authenticated user.
-- security_invoker makes the view run as the querying user.
--
-- NOTE: this option is lost whenever the view is dropped and
-- recreated (as in migration 010). Any future migration that
-- recreates events_feed must use:
--   create view public.events_feed with (security_invoker = true) as ...

alter view public.events_feed set (security_invoker = true);
