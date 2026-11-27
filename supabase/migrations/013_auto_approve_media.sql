-- ============================================================
-- TicketBook – Migration 013: auto-approve event media
-- ============================================================
-- Nothing ever moved media out of 'pending', and friends can only
-- read 'approved' media ("event_media: approved read"), so friends
-- never saw each other's images.
--
-- Until a real moderation step exists, new media is approved on
-- insert. To reintroduce moderation later, set the default back to
-- 'pending' and approve/reject from a service-role process.

alter table public.event_media
  alter column moderation_status set default 'approved';

-- Backfill media uploaded while everything was stuck in 'pending'.
update public.event_media
  set moderation_status = 'approved'
  where moderation_status = 'pending';
