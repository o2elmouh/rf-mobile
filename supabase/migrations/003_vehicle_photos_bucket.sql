-- Wave 1.3 — storage bucket for vehicle reference photos.
-- Path convention: vehicle-photos/{agency_id}/{vehicle_id}/{filename}
-- Photos are listed by folder; no separate DB table is needed (mirrors the
-- approach we chose to avoid adding a `vehicles.photos` JSONB column).
--
-- Bucket is private. Mobile reads via signed URLs created at list time.
-- RLS on storage.objects scopes access to the user's agency by parsing
-- the first path segment (agency_id) and matching it against the caller's
-- profiles.agency_id.

INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: extract agency_id from a "vehicle-photos/{agency_id}/..." object path.
-- storage.foldername() returns text[] split on '/'.
DROP POLICY IF EXISTS "vehicle_photos_read_own_agency"   ON storage.objects;
DROP POLICY IF EXISTS "vehicle_photos_insert_own_agency" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_photos_delete_own_agency" ON storage.objects;

CREATE POLICY "vehicle_photos_read_own_agency"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = (
      SELECT agency_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "vehicle_photos_insert_own_agency"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = (
      SELECT agency_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "vehicle_photos_delete_own_agency"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = (
      SELECT agency_id::text FROM profiles WHERE id = auth.uid()
    )
  );
