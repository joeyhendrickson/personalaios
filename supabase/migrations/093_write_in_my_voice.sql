-- Write In My Voice: personal writing corpus, voice profile, and generated drafts

CREATE TABLE IF NOT EXISTS write_in_my_voice_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  source_type TEXT NOT NULL CHECK (source_type IN ('facebook', 'blog', 'email', 'other')),
  file_name TEXT NOT NULL,
  content_text TEXT NOT NULL,
  word_count INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS write_in_my_voice_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  voice_profile JSONB NOT NULL,
  sample_count INT NOT NULL DEFAULT 0,
  total_words INT NOT NULL DEFAULT 0,
  confidence_score NUMERIC(4, 3) DEFAULT 0.75,
  last_analyzed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS write_in_my_voice_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  material_type TEXT NOT NULL CHECK (material_type IN ('blog_post', 'social_media_post', 'email', 'book')),
  prompt TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  voice_match_score NUMERIC(4, 3),
  cross_context_modules TEXT[] DEFAULT '{}',
  generation_params JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ledger for voice-corpus Pinecone chunks (isolated from advisor cache sync)
CREATE TABLE IF NOT EXISTS write_in_my_voice_vector_ledger (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  pinecone_id TEXT NOT NULL,
  sample_id UUID REFERENCES write_in_my_voice_samples(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, chunk_id)
);

CREATE INDEX IF NOT EXISTS idx_wimv_samples_user_created
  ON write_in_my_voice_samples(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wimv_samples_user_source
  ON write_in_my_voice_samples(user_id, source_type);

CREATE INDEX IF NOT EXISTS idx_wimv_drafts_user_created
  ON write_in_my_voice_drafts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wimv_drafts_user_material
  ON write_in_my_voice_drafts(user_id, material_type);

CREATE INDEX IF NOT EXISTS idx_wimv_vector_ledger_user
  ON write_in_my_voice_vector_ledger(user_id);

ALTER TABLE write_in_my_voice_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE write_in_my_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE write_in_my_voice_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE write_in_my_voice_vector_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice samples"
  ON write_in_my_voice_samples FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice samples"
  ON write_in_my_voice_samples FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voice samples"
  ON write_in_my_voice_samples FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own voice samples"
  ON write_in_my_voice_samples FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own voice profile"
  ON write_in_my_voice_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice profile"
  ON write_in_my_voice_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voice profile"
  ON write_in_my_voice_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own voice profile"
  ON write_in_my_voice_profiles FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own voice drafts"
  ON write_in_my_voice_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice drafts"
  ON write_in_my_voice_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voice drafts"
  ON write_in_my_voice_drafts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own voice drafts"
  ON write_in_my_voice_drafts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own voice vector ledger"
  ON write_in_my_voice_vector_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice vector ledger"
  ON write_in_my_voice_vector_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voice vector ledger"
  ON write_in_my_voice_vector_ledger FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own voice vector ledger"
  ON write_in_my_voice_vector_ledger FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_write_in_my_voice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wimv_samples_updated_at
  BEFORE UPDATE ON write_in_my_voice_samples
  FOR EACH ROW EXECUTE FUNCTION update_write_in_my_voice_updated_at();

CREATE TRIGGER trg_wimv_profiles_updated_at
  BEFORE UPDATE ON write_in_my_voice_profiles
  FOR EACH ROW EXECUTE FUNCTION update_write_in_my_voice_updated_at();

CREATE TRIGGER trg_wimv_drafts_updated_at
  BEFORE UPDATE ON write_in_my_voice_drafts
  FOR EACH ROW EXECUTE FUNCTION update_write_in_my_voice_updated_at();

CREATE TRIGGER trg_wimv_vector_ledger_updated_at
  BEFORE UPDATE ON write_in_my_voice_vector_ledger
  FOR EACH ROW EXECUTE FUNCTION update_write_in_my_voice_updated_at();

COMMENT ON TABLE write_in_my_voice_samples IS 'User-uploaded writing samples (Facebook, blog, email) for voice analysis';
COMMENT ON TABLE write_in_my_voice_profiles IS 'Analyzed personal writing voice profile (JSONB)';
COMMENT ON TABLE write_in_my_voice_drafts IS 'AI-generated content in the user personal writing voice';
COMMENT ON TABLE write_in_my_voice_vector_ledger IS 'Pinecone chunk ledger for write-in-my-voice corpus (module_id isolated)';
