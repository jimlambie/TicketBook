-- ============================================================
-- TicketBook – Migration 018: private event-media bucket
-- ============================================================
-- The event-media bucket was public, so anyone holding an image URL
-- could fetch it, regardless of event visibility, moderation status,
-- or whether the viewer was still a friend.
--
-- Make the bucket private and only allow reading a file when the
-- viewer could read its event_media row: their own files, or approved
-- media on an event they can view. The app now requests short-lived
-- signed URLs (createSignedUrls), which go through this policy.
--
-- Avatars stay public: they're shown wherever a username is.

create index if not exists idx_event_media_storage_path
  on public.event_media (storage_path);

create or replace function public.can_view_media_object(p_name text)
returns boolean
language sql security definer stable set search_path = public as $$
  select
    (storage.foldername(p_name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.event_media m
      join public.events e on e.id = m.event_id
      where m.storage_path = p_name
        and m.moderation_status = 'approved'
        and public.can_view_event(e)
    );
$$;

revoke all on function public.can_view_media_object(text) from public;
grant execute on function public.can_view_media_object(text) to authenticated;

drop policy if exists "storage: public read" on storage.objects;

create policy "storage: event media read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'event-media'
    and public.can_view_media_object(name)
  );

update storage.buckets
  set public = false
  where id = 'event-media';
