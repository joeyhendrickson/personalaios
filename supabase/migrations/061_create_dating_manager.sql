-- Migration: Dating Management module
-- Prospect cards, photo analyses, AI-inferred partner criteria, and AI evaluations.

-- ---------------------------------------------------------------------------
-- dating_prospects: one card per potential partner
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dating_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | archived
  zip_code TEXT,
  how_we_met TEXT,
  positive_qualities TEXT,
  toxic_qualities TEXT,
  unknowns TEXT,
  feels_known TEXT, -- does this partner make you feel known/seen?
  conflict_style TEXT, -- do they fight/argue to gain control?
  notes TEXT,
  assessment JSONB NOT NULL DEFAULT '{}', -- structured Q&A answers
  attractiveness_score INTEGER, -- latest AI photo score (0-100)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dating_prospects_user
  ON dating_prospects (user_id, status, updated_at DESC);

-- ---------------------------------------------------------------------------
-- dating_prospect_photos: prospect headshots + couple photos with AI analysis
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dating_prospect_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES dating_prospects (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'prospect', -- prospect | couple
  analysis JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dating_prospect_photos_prospect
  ON dating_prospect_photos (prospect_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- dating_partner_criteria: AI-inferred "what you need in a partner" (1 per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dating_partner_criteria (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  summary TEXT,
  criteria JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- dating_evaluations: AI summary evaluations (per prospect, or overall compare)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dating_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES dating_prospects (id) ON DELETE CASCADE, -- null = overall
  scope TEXT NOT NULL DEFAULT 'prospect', -- prospect | overall
  result JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dating_evaluations_user
  ON dating_evaluations (user_id, scope, created_at DESC);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE dating_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE dating_prospect_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dating_partner_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE dating_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dating_prospects_all" ON dating_prospects;
DROP POLICY IF EXISTS "dating_prospect_photos_all" ON dating_prospect_photos;
DROP POLICY IF EXISTS "dating_partner_criteria_all" ON dating_partner_criteria;
DROP POLICY IF EXISTS "dating_evaluations_all" ON dating_evaluations;

CREATE POLICY "dating_prospects_all" ON dating_prospects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dating_prospect_photos_all" ON dating_prospect_photos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dating_partner_criteria_all" ON dating_partner_criteria
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dating_evaluations_all" ON dating_evaluations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket (private): dating-manager/{user_id}/...
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('dating-manager', 'dating-manager', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "dating_manager_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "dating_manager_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "dating_manager_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "dating_manager_storage_delete" ON storage.objects;

CREATE POLICY "dating_manager_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dating-manager'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "dating_manager_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dating-manager'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "dating_manager_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'dating-manager'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "dating_manager_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'dating-manager'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
