-- Relationship Manager production extensions (LifeHacks / LifeStacks)
-- Maps conceptual "people" to existing `relationships` table; adds CRM, events, outreach, vectors.

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- relationships: additive columns (safe if table exists from manual SQL)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS relationships
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS consent_flags JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cached_scores JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_score_computed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_relationships_zip ON relationships (zip_code)
  WHERE zip_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- contact_history: sentiment + provenance (additive)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS contact_history
  ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE INDEX IF NOT EXISTS idx_contact_history_sentiment ON contact_history (sentiment)
  WHERE sentiment IS NOT NULL;

-- ---------------------------------------------------------------------------
-- person_aliases (relationship_aliases)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships (id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_relationship_aliases_unique ON relationship_aliases (relationship_id, lower(alias));

CREATE INDEX IF NOT EXISTS idx_relationship_aliases_user ON relationship_aliases (user_id);
CREATE INDEX IF NOT EXISTS idx_relationship_aliases_rel ON relationship_aliases (relationship_id);

-- ---------------------------------------------------------------------------
-- relationship_notes (timeline notes; distinct from relationships.notes blob)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relationship_notes_rel ON relationship_notes (relationship_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- interaction_signals (granular signals; optional FK to contact_history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_interaction_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships (id) ON DELETE CASCADE,
  contact_history_id UUID REFERENCES contact_history (id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_interaction_signals_rel ON relationship_interaction_signals (relationship_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- relationship_summaries (OpenAI refresh; optional embedding for RAG)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships (id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  model TEXT NOT NULL,
  source_version TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relationship_summaries_rel ON relationship_summaries (relationship_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relationship_summaries_embedding ON relationship_summaries
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding IS NOT NULL;

-- ---------------------------------------------------------------------------
-- relationship_score_snapshots (auditable scoring history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships (id) ON DELETE CASCADE,
  health_score SMALLINT NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  attention_score SMALLINT NOT NULL CHECK (attention_score >= 0 AND attention_score <= 100),
  recency_score SMALLINT NOT NULL CHECK (recency_score >= 0 AND recency_score <= 100),
  components JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_snapshots_rel ON relationship_score_snapshots (relationship_id, computed_at DESC);

-- ---------------------------------------------------------------------------
-- photo_assets (Picker / import metadata; complements relationship_photos)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_photo_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES relationships (id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'google_picker',
  external_ref TEXT NOT NULL,
  storage_path TEXT,
  taken_at TIMESTAMPTZ,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  place_label TEXT,
  user_caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider, external_ref)
);

CREATE INDEX IF NOT EXISTS idx_photo_assets_user ON relationship_photo_assets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_assets_rel ON relationship_photo_assets (relationship_id)
  WHERE relationship_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- shared_memories (user-asserted "we did X" — no face-ID assumption)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships (id) ON DELETE CASCADE,
  title TEXT,
  body TEXT NOT NULL,
  memory_at TIMESTAMPTZ,
  place_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'user',
  photo_asset_id UUID REFERENCES relationship_photo_assets (id) ON DELETE SET NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_memories_rel ON shared_memories (relationship_id, memory_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_memories_embedding ON shared_memories
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding IS NOT NULL;

-- ---------------------------------------------------------------------------
-- event_candidates (raw cache from Eventbrite / Places)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'eventbrite',
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  venue_name TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  zip_code TEXT,
  url TEXT,
  raw JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_event_candidates_zip ON event_candidates (zip_code, start_at);
CREATE INDEX IF NOT EXISTS idx_event_candidates_user ON event_candidates (user_id, fetched_at DESC);

-- ---------------------------------------------------------------------------
-- event_recommendations (scored rows for UI)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES relationships (id) ON DELETE CASCADE,
  event_candidate_id UUID NOT NULL REFERENCES event_candidates (id) ON DELETE CASCADE,
  score REAL NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, relationship_id, event_candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_event_recommendations_rel ON event_recommendations (relationship_id, score DESC);

-- ---------------------------------------------------------------------------
-- outreach_drafts + sent_messages (audit)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships (id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  subject TEXT,
  body TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'discarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_drafts_rel ON outreach_drafts (relationship_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships (id) ON DELETE CASCADE,
  outreach_draft_id UUID REFERENCES outreach_drafts (id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  to_fingerprint TEXT NOT NULL,
  body_preview TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sent_messages_rel ON sent_messages (relationship_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sent_messages_provider ON sent_messages (provider, provider_message_id);

-- ---------------------------------------------------------------------------
-- reminders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES relationships (id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  fire_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled', 'snoozed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relationship_reminders_fire ON relationship_reminders (user_id, fire_at)
  WHERE status = 'scheduled';

-- ---------------------------------------------------------------------------
-- external_accounts (per-user OAuth / API connections)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_external_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

-- ---------------------------------------------------------------------------
-- sync_jobs + import_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error TEXT,
  stats JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relationship_sync_jobs_user ON relationship_sync_jobs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS relationship_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  sync_job_id UUID REFERENCES relationship_sync_jobs (id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  rows_upserted INTEGER NOT NULL DEFAULT 0,
  rows_skipped INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE relationship_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_interaction_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_photo_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_external_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_import_logs ENABLE ROW LEVEL SECURITY;

-- Aliases
CREATE POLICY "rm_aliases_all" ON relationship_aliases FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notes
CREATE POLICY "rm_notes_all" ON relationship_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Signals
CREATE POLICY "rm_signals_all" ON relationship_interaction_signals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Summaries
CREATE POLICY "rm_summaries_all" ON relationship_summaries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Score snapshots
CREATE POLICY "rm_scores_all" ON relationship_score_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Memories
CREATE POLICY "rm_memories_all" ON shared_memories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Photo assets
CREATE POLICY "rm_photo_assets_all" ON relationship_photo_assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Events
CREATE POLICY "rm_event_candidates_all" ON event_candidates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rm_event_recommendations_all" ON event_recommendations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Outreach
CREATE POLICY "rm_outreach_drafts_all" ON outreach_drafts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rm_sent_messages_all" ON sent_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reminders
CREATE POLICY "rm_reminders_all" ON relationship_reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- External accounts
CREATE POLICY "rm_external_accounts_all" ON relationship_external_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Jobs / logs
CREATE POLICY "rm_sync_jobs_all" ON relationship_sync_jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rm_import_logs_all" ON relationship_import_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at triggers (reuse generic if present)
CREATE OR REPLACE FUNCTION update_rm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_relationship_notes_updated ON relationship_notes;
CREATE TRIGGER tr_relationship_notes_updated
  BEFORE UPDATE ON relationship_notes
  FOR EACH ROW EXECUTE FUNCTION update_rm_updated_at();

DROP TRIGGER IF EXISTS tr_outreach_drafts_updated ON outreach_drafts;
CREATE TRIGGER tr_outreach_drafts_updated
  BEFORE UPDATE ON outreach_drafts
  FOR EACH ROW EXECUTE FUNCTION update_rm_updated_at();

DROP TRIGGER IF EXISTS tr_relationship_external_accounts_updated ON relationship_external_accounts;
CREATE TRIGGER tr_relationship_external_accounts_updated
  BEFORE UPDATE ON relationship_external_accounts
  FOR EACH ROW EXECUTE FUNCTION update_rm_updated_at();
