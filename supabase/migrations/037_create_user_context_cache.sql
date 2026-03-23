-- AI Context Cache: Cost-efficient precomputed summaries for AI prompts
-- See docs/ai-context-cache-architecture.md

-- Main cache table
CREATE TABLE IF NOT EXISTS user_context_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

    -- Four-layer context summaries (JSONB for structured queries)
    static_profile_summary_json JSONB,
    structured_state_summary_json JSONB,
    derived_insights_summary_json JSONB,

    -- Versioning and staleness
    cache_version INTEGER NOT NULL DEFAULT 1,
    source_data_checksum TEXT,
    last_full_refresh_at TIMESTAMP WITH TIME ZONE,
    last_incremental_refresh_at TIMESTAMP WITH TIME ZONE,
    refresh_status TEXT NOT NULL DEFAULT 'idle' CHECK (refresh_status IN ('idle', 'running', 'success', 'failed')),
    refresh_error TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_context_cache_user_id ON user_context_cache(user_id);
CREATE INDEX idx_user_context_cache_last_full_refresh ON user_context_cache(last_full_refresh_at);
CREATE INDEX idx_user_context_cache_refresh_status ON user_context_cache(refresh_status);

-- Track refresh jobs to avoid duplicates
CREATE TABLE IF NOT EXISTS cache_refresh_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('full', 'incremental')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cache_refresh_jobs_user_status ON cache_refresh_jobs(user_id, status);
CREATE INDEX idx_cache_refresh_jobs_created ON cache_refresh_jobs(created_at);

-- Optional: lightweight AI request logs for cost observability
CREATE TABLE IF NOT EXISTS ai_request_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT,
    used_cache BOOLEAN DEFAULT FALSE,
    estimated_tokens_input INTEGER,
    estimated_tokens_output INTEGER,
    model_used TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_request_logs_user_id ON ai_request_logs(user_id);
CREATE INDEX idx_ai_request_logs_created ON ai_request_logs(created_at);

-- RLS
ALTER TABLE user_context_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_refresh_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own context cache"
    ON user_context_cache FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users cannot insert own cache" ON user_context_cache FOR INSERT WITH CHECK (false);
CREATE POLICY "Users cannot update own cache" ON user_context_cache FOR UPDATE USING (false);
CREATE POLICY "Users cannot delete own cache" ON user_context_cache FOR DELETE USING (false);
-- Service role / server writes bypass RLS

CREATE POLICY "Users can view own refresh jobs"
    ON cache_refresh_jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users cannot insert refresh jobs" ON cache_refresh_jobs FOR INSERT WITH CHECK (false);
CREATE POLICY "Users cannot update refresh jobs" ON cache_refresh_jobs FOR UPDATE USING (false);
CREATE POLICY "Users cannot delete refresh jobs" ON cache_refresh_jobs FOR DELETE USING (false);

CREATE POLICY "Users can view own ai_request_logs"
    ON ai_request_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users cannot insert ai_request_logs" ON ai_request_logs FOR INSERT WITH CHECK (false);
CREATE POLICY "Users cannot update ai_request_logs" ON ai_request_logs FOR UPDATE USING (false);
CREATE POLICY "Users cannot delete ai_request_logs" ON ai_request_logs FOR DELETE USING (false);
