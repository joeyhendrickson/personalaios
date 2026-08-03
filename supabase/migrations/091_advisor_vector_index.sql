-- Advisor RAG vector index: ledger + sync metadata + event log
-- One Pinecone namespace per user (namespace = user_id)

ALTER TABLE user_context_cache
  ADD COLUMN IF NOT EXISTS vector_index_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (vector_index_status IN ('idle', 'running', 'success', 'failed')),
  ADD COLUMN IF NOT EXISTS last_vector_index_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS vector_chunk_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vector_index_checksum TEXT,
  ADD COLUMN IF NOT EXISTS vector_index_error TEXT;

CREATE INDEX IF NOT EXISTS idx_user_context_cache_vector_status
  ON user_context_cache(vector_index_status);
CREATE INDEX IF NOT EXISTS idx_user_context_cache_last_vector_index
  ON user_context_cache(last_vector_index_at);

-- Tracks each indexed chunk for incremental sync (skip unchanged embeds)
CREATE TABLE IF NOT EXISTS user_vector_index (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  module_id TEXT,
  source_type TEXT,
  label TEXT,
  pinecone_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, chunk_id)
);

CREATE INDEX IF NOT EXISTS idx_user_vector_index_user_id ON user_vector_index(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vector_index_module_id ON user_vector_index(module_id);

-- Admin analytics: sync + retrieve events
CREATE TABLE IF NOT EXISTS advisor_rag_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('sync', 'retrieve', 'health_check')),
  status TEXT NOT NULL,
  chunks_upserted INTEGER NOT NULL DEFAULT 0,
  chunks_deleted INTEGER NOT NULL DEFAULT 0,
  chunks_retrieved INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisor_rag_events_created ON advisor_rag_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advisor_rag_events_user_id ON advisor_rag_events(user_id);
CREATE INDEX IF NOT EXISTS idx_advisor_rag_events_event_type ON advisor_rag_events(event_type);

ALTER TABLE user_vector_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_rag_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vector index ledger"
  ON user_vector_index FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users cannot write vector index ledger"
  ON user_vector_index FOR INSERT WITH CHECK (false);
CREATE POLICY "Users cannot update vector index ledger"
  ON user_vector_index FOR UPDATE USING (false);
CREATE POLICY "Users cannot delete vector index ledger"
  ON user_vector_index FOR DELETE USING (false);

CREATE POLICY "Users cannot read rag events"
  ON advisor_rag_events FOR SELECT USING (false);
CREATE POLICY "Users cannot write rag events"
  ON advisor_rag_events FOR INSERT WITH CHECK (false);
