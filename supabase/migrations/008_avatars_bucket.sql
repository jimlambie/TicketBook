-- ============================================================
-- TicketBook – Migration 008: Avatars Storage Bucket
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Upload: authenticated users may only write into their own folder
create policy "avatars: own upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read: public bucket — anyone can read
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Delete: users can only delete files in their own folder
create policy "avatars: own delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update (upsert): users can only overwrite files in their own folder
create policy "avatars: own update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
