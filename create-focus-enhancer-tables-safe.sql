-- Create tables for Focus Enhancer app (Safe version - handles existing tables)
-- This migration creates tables to store screen time analysis and therapeutic conversations

-- Table to store screen time analyses
CREATE TABLE IF NOT EXISTS focus_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_usage_data JSONB NOT NULL,
  total_screen_time NUMERIC(5,2),
  problematic_apps TEXT[],
  insights JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE focus_analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own focus analyses" ON focus_analyses;
    DROP POLICY IF EXISTS "Users can insert their own focus analyses" ON focus_analyses;
    DROP POLICY IF EXISTS "Users can update their own focus analyses" ON focus_analyses;
    DROP POLICY IF EXISTS "Users can delete their own focus analyses" ON focus_analyses;
EXCEPTION
    WHEN undefined_table THEN
        NULL; -- Table doesn't exist yet, ignore
END $$;

-- RLS Policies for focus_analyses
CREATE POLICY "Users can view their own focus analyses" ON focus_analyses
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own focus analyses" ON focus_analyses
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus analyses" ON focus_analyses
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus analyses" ON focus_analyses
FOR DELETE USING (auth.uid() = user_id);

-- Table to store therapeutic conversations
CREATE TABLE IF NOT EXISTS focus_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  app_usage_context JSONB,
  therapeutic_insights JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE focus_conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own focus conversations" ON focus_conversations;
    DROP POLICY IF EXISTS "Users can insert their own focus conversations" ON focus_conversations;
    DROP POLICY IF EXISTS "Users can update their own focus conversations" ON focus_conversations;
    DROP POLICY IF EXISTS "Users can delete their own focus conversations" ON focus_conversations;
EXCEPTION
    WHEN undefined_table THEN
        NULL; -- Table doesn't exist yet, ignore
END $$;

-- RLS Policies for focus_conversations
CREATE POLICY "Users can view their own focus conversations" ON focus_conversations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own focus conversations" ON focus_conversations
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus conversations" ON focus_conversations
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus conversations" ON focus_conversations
FOR DELETE USING (auth.uid() = user_id);

-- Table to track identified fears and insecurities
CREATE TABLE IF NOT EXISTS user_fears_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fear_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) NOT NULL,
  related_apps TEXT[],
  coping_strategies TEXT[],
  progress_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_fears_insights ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own fears insights" ON user_fears_insights;
    DROP POLICY IF EXISTS "Users can insert their own fears insights" ON user_fears_insights;
    DROP POLICY IF EXISTS "Users can update their own fears insights" ON user_fears_insights;
    DROP POLICY IF EXISTS "Users can delete their own fears insights" ON user_fears_insights;
EXCEPTION
    WHEN undefined_table THEN
        NULL; -- Table doesn't exist yet, ignore
END $$;

-- RLS Policies for user_fears_insights
CREATE POLICY "Users can view their own fears insights" ON user_fears_insights
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fears insights" ON user_fears_insights
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fears insights" ON user_fears_insights
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fears insights" ON user_fears_insights
FOR DELETE USING (auth.uid() = user_id);

-- Table to track focus improvement suggestions
CREATE TABLE IF NOT EXISTS focus_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  suggestion_type TEXT CHECK (suggestion_type IN ('goal', 'habit', 'project', 'feature')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  points_value INTEGER,
  target_points INTEGER,
  is_implemented BOOLEAN DEFAULT FALSE,
  implementation_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE focus_suggestions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own focus suggestions" ON focus_suggestions;
    DROP POLICY IF EXISTS "Users can insert their own focus suggestions" ON focus_suggestions;
    DROP POLICY IF EXISTS "Users can update their own focus suggestions" ON focus_suggestions;
    DROP POLICY IF EXISTS "Users can delete their own focus suggestions" ON focus_suggestions;
EXCEPTION
    WHEN undefined_table THEN
        NULL; -- Table doesn't exist yet, ignore
END $$;

-- RLS Policies for focus_suggestions
CREATE POLICY "Users can view their own focus suggestions" ON focus_suggestions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own focus suggestions" ON focus_suggestions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus suggestions" ON focus_suggestions
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus suggestions" ON focus_suggestions
FOR DELETE USING (auth.uid() = user_id);

-- Table to store complete analysis summaries
CREATE TABLE IF NOT EXISTS focus_analysis_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  app_usage_data JSONB NOT NULL,
  therapeutic_insights JSONB,
  conversation_data JSONB,
  dynamic_suggestions JSONB,
  user_fears JSONB,
  suggested_habits JSONB,
  suggested_projects JSONB,
  total_screen_time NUMERIC(5,2),
  problematic_apps_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE focus_analysis_summaries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own analysis summaries" ON focus_analysis_summaries;
    DROP POLICY IF EXISTS "Users can insert their own analysis summaries" ON focus_analysis_summaries;
    DROP POLICY IF EXISTS "Users can update their own analysis summaries" ON focus_analysis_summaries;
    DROP POLICY IF EXISTS "Users can delete their own analysis summaries" ON focus_analysis_summaries;
EXCEPTION
    WHEN undefined_table THEN
        NULL; -- Table doesn't exist yet, ignore
END $$;

-- RLS Policies for focus_analysis_summaries
CREATE POLICY "Users can view their own analysis summaries" ON focus_analysis_summaries
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis summaries" ON focus_analysis_summaries
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis summaries" ON focus_analysis_summaries
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis summaries" ON focus_analysis_summaries
FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_focus_analyses_user_id ON focus_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_analyses_created_at ON focus_analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_focus_conversations_user_id ON focus_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_conversations_created_at ON focus_conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_user_fears_insights_user_id ON user_fears_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fears_insights_severity ON user_fears_insights(severity);
CREATE INDEX IF NOT EXISTS idx_focus_suggestions_user_id ON focus_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_suggestions_type ON focus_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_focus_suggestions_implemented ON focus_suggestions(is_implemented);
CREATE INDEX IF NOT EXISTS idx_focus_analysis_summaries_user_id ON focus_analysis_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_analysis_summaries_timestamp ON focus_analysis_summaries(timestamp);
CREATE INDEX IF NOT EXISTS idx_focus_analysis_summaries_created_at ON focus_analysis_summaries(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_user_fears_insights_updated_at ON user_fears_insights;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_fears_insights_updated_at 
    BEFORE UPDATE ON user_fears_insights 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
