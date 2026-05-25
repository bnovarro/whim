-- ─── Whim: Storage bucket + policies ─────────────────────────────────────────
-- Run this AFTER creating the "profile-photos" bucket in the Supabase Dashboard.
-- Dashboard → Storage → New bucket → Name: "profile-photos" → Public: ON → Create

-- ── RLS policies for profile-photos bucket ───────────────────────────────────

-- Authenticated users can upload to their own folder (userId/avatar.ext)
create policy "Users can upload their own photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update/replace their own photo
create policy "Users can update their own photo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can read photos (bucket is public, but explicit policy for clarity)
create policy "Photos are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'profile-photos');

-- Users can delete their own photo
create policy "Users can delete their own photo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
