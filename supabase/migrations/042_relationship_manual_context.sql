-- Relationship Manager: manual media, structured profile context, storage bucket

-- ---------------------------------------------------------------------------
-- relationships: structured notes (additive)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS relationships
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS years_known NUMERIC(6, 1),
  ADD COLUMN IF NOT EXISTS interests TEXT,
  ADD COLUMN IF NOT EXISTS vision TEXT,
  ADD COLUMN IF NOT EXISTS habits TEXT;

COMMENT ON COLUMN relationships.profession IS 'Their profession or role';
COMMENT ON COLUMN relationships.years_known IS 'Approximate years the user has known this person';
COMMENT ON COLUMN relationships.interests IS 'Free-text interests for AI context';
COMMENT ON COLUMN relationships.vision IS 'Their stated goals, vision, direction';
COMMENT ON COLUMN relationships.habits IS 'Habits, preferences, communication style';

-- ---------------------------------------------------------------------------
-- relationship_photos: support manual uploads (Google path deprecated)
-- ---------------------------------------------------------------------------
ALTER TABLE relationship_photos
  ALTER COLUMN google_photo_id DROP NOT NULL;

ALTER TABLE relationship_photos DROP CONSTRAINT IF EXISTS relationship_photos_google_photo_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_relationship_photos_google_photo_id_unique
  ON relationship_photos (google_photo_id)
  WHERE google_photo_id IS NOT NULL;

ALTER TABLE relationship_photos
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS user_caption TEXT;

ALTER TABLE relationship_photos DROP CONSTRAINT IF EXISTS relationship_photos_source_check;

ALTER TABLE relationship_photos
  ADD CONSTRAINT relationship_photos_source_check CHECK (source IN ('google', 'manual'));

ALTER TABLE relationship_photos
  ADD CONSTRAINT relationship_photos_manual_requires_storage CHECK (
    source <> 'manual' OR storage_path IS NOT NULL
  );

ALTER TABLE relationship_photos
  ALTER COLUMN photo_url DROP NOT NULL;

COMMENT ON COLUMN relationship_photos.storage_path IS 'Supabase Storage path under relationship-manager bucket';

-- ---------------------------------------------------------------------------
-- relationship_documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships (id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('project_plan', 'agreement', 'email_export', 'other')),
  file_name TEXT NOT NULL,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  extracted_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relationship_documents_rel
  ON relationship_documents (relationship_id, created_at DESC);

ALTER TABLE relationship_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rm_documents_select"
  ON relationship_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "rm_documents_insert"
  ON relationship_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rm_documents_update"
  ON relationship_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "rm_documents_delete"
  ON relationship_documents FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- relationship_message_screenshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_message_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption_notes TEXT,
  ai_thread_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relationship_message_screenshots_rel
  ON relationship_message_screenshots (relationship_id, created_at DESC);

ALTER TABLE relationship_message_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rm_screenshots_select"
  ON relationship_message_screenshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "rm_screenshots_insert"
  ON relationship_message_screenshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rm_screenshots_update"
  ON relationship_message_screenshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "rm_screenshots_delete"
  ON relationship_message_screenshots FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket (private): relationship-manager/{user_id}/...
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('relationship-manager', 'relationship-manager', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "relationship_manager_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "relationship_manager_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "relationship_manager_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "relationship_manager_storage_delete" ON storage.objects;

CREATE POLICY "relationship_manager_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'relationship-manager'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "relationship_manager_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'relationship-manager'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "relationship_manager_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'relationship-manager'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "relationship_manager_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'relationship-manager'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
