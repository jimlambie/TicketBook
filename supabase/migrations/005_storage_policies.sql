-- ============================================================
-- TicketBook – Migration 005: Storage Bucket & Policies
-- ============================================================

-- Create the event-media bucket (public so getPublicUrl works without signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-media',
  'event-media',
  true,
  52428800, -- 50 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf']
)
on conflict (id) do nothing;

-- ============================================================
-- STORAGE OBJECT POLICIES
-- Path convention: {user_id}/{event_id}/{type}_{timestamp}.{ext}
-- ============================================================

-- Upload: authenticated users may only write into their own folder
create policy "storage: own upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read: public bucket — anyone can read (needed for getPublicUrl)
create policy "storage: public read"
  on storage.objects for select
  using (bucket_id = 'event-media');

-- Delete: users can only delete files in their own folder
create policy "storage: own delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update (upsert): users can only overwrite files in their own folder
create policy "storage: own update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
