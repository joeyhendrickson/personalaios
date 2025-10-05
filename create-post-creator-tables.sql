-- Post Creator Tool Database Schema
-- This creates all necessary tables for the Post Creator Tool

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Voice Analysis Jobs Table
CREATE TABLE IF NOT EXISTS post_creator_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Job metadata
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,
  
  -- Google Drive integration
  drive_folder_id TEXT NOT NULL,
  drive_folder_url TEXT NOT NULL,
  
  -- Voice analysis results
  voice_profile JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Voice Profiles Table
CREATE TABLE IF NOT EXISTS post_creator_voice_profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  job_id UUID REFERENCES post_creator_jobs(id) ON DELETE CASCADE NOT NULL,
  
  -- Voice profile data
  voice_profile JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Generated Posts Table
CREATE TABLE IF NOT EXISTS post_creator_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Post metadata
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'linkedin', 'instagram', 'reddit', 'twitter')),
  content TEXT NOT NULL,
  title TEXT,
  
  -- Post elements
  hashtags JSONB DEFAULT '[]'::jsonb,
  call_to_action TEXT,
  
  -- Quality metrics
  engagement_score INTEGER DEFAULT 5 CHECK (engagement_score >= 1 AND engagement_score <= 10),
  voice_match_score DECIMAL(3,2) DEFAULT 0.8 CHECK (voice_match_score >= 0.0 AND voice_match_score <= 1.0),
  
  -- Generation parameters
  generation_params JSONB,
  
  -- Usage tracking
  times_copied INTEGER DEFAULT 0,
  times_shared INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Social Media Templates Table (for future enhancement)
CREATE TABLE IF NOT EXISTS post_creator_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'linkedin', 'instagram', 'reddit', 'twitter')),
  
  -- Template content
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Post Analytics Table (for future enhancement)
CREATE TABLE IF NOT EXISTS post_creator_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES post_creator_posts(id) ON DELETE CASCADE NOT NULL,
  
  -- Analytics data
  platform TEXT NOT NULL,
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE post_creator_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_creator_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_creator_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_creator_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_creator_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_creator_jobs
CREATE POLICY "Users can view their own voice analysis jobs" ON post_creator_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice analysis jobs" ON post_creator_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice analysis jobs" ON post_creator_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice analysis jobs" ON post_creator_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for post_creator_voice_profiles
CREATE POLICY "Users can view their own voice profiles" ON post_creator_voice_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice profiles" ON post_creator_voice_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice profiles" ON post_creator_voice_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice profiles" ON post_creator_voice_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for post_creator_posts
CREATE POLICY "Users can view their own posts" ON post_creator_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts" ON post_creator_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON post_creator_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON post_creator_posts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for post_creator_templates
CREATE POLICY "Users can view their own templates" ON post_creator_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates" ON post_creator_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON post_creator_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON post_creator_templates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for post_creator_analytics
CREATE POLICY "Users can view their own analytics" ON post_creator_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON post_creator_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics" ON post_creator_analytics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analytics" ON post_creator_analytics
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_creator_jobs_user_id ON post_creator_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_post_creator_jobs_status ON post_creator_jobs(status);
CREATE INDEX IF NOT EXISTS idx_post_creator_jobs_created_at ON post_creator_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_creator_voice_profiles_user_id ON post_creator_voice_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_post_creator_voice_profiles_job_id ON post_creator_voice_profiles(job_id);

CREATE INDEX IF NOT EXISTS idx_post_creator_posts_user_id ON post_creator_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_post_creator_posts_platform ON post_creator_posts(platform);
CREATE INDEX IF NOT EXISTS idx_post_creator_posts_created_at ON post_creator_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_creator_posts_engagement_score ON post_creator_posts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_post_creator_posts_voice_match_score ON post_creator_posts(voice_match_score DESC);

CREATE INDEX IF NOT EXISTS idx_post_creator_templates_user_id ON post_creator_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_post_creator_templates_platform ON post_creator_templates(platform);
CREATE INDEX IF NOT EXISTS idx_post_creator_templates_times_used ON post_creator_templates(times_used DESC);

CREATE INDEX IF NOT EXISTS idx_post_creator_analytics_user_id ON post_creator_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_post_creator_analytics_post_id ON post_creator_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_post_creator_analytics_platform ON post_creator_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_post_creator_analytics_recorded_at ON post_creator_analytics(recorded_at DESC);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_posts_user_platform_created ON post_creator_posts(user_id, platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_engagement_voice ON post_creator_posts(user_id, engagement_score DESC, voice_match_score DESC);

-- Add comments to document the schema
COMMENT ON TABLE post_creator_jobs IS 'Voice analysis jobs for processing social media post files from Google Drive';
COMMENT ON TABLE post_creator_voice_profiles IS 'Analyzed voice profiles extracted from user historical social media posts';
COMMENT ON TABLE post_creator_posts IS 'AI-generated social media posts with voice matching and engagement scoring';
COMMENT ON TABLE post_creator_templates IS 'Reusable post templates for consistent voice and style';
COMMENT ON TABLE post_creator_analytics IS 'Performance analytics for generated posts across platforms';

COMMENT ON COLUMN post_creator_voice_profiles.voice_profile IS 'JSON object containing writing style, common phrases, platform preferences, and engagement patterns';
COMMENT ON COLUMN post_creator_posts.voice_match_score IS 'Score indicating how well the generated post matches the user voice profile (0.0-1.0)';
COMMENT ON COLUMN post_creator_posts.engagement_score IS 'Predicted engagement score for the generated post (1-10)';
COMMENT ON COLUMN post_creator_posts.generation_params IS 'JSON object containing the parameters used to generate the post';

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_post_creator_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_post_creator_jobs_updated_at BEFORE UPDATE ON post_creator_jobs FOR EACH ROW EXECUTE FUNCTION update_post_creator_updated_at_column();
CREATE TRIGGER update_post_creator_voice_profiles_updated_at BEFORE UPDATE ON post_creator_voice_profiles FOR EACH ROW EXECUTE FUNCTION update_post_creator_updated_at_column();
CREATE TRIGGER update_post_creator_posts_updated_at BEFORE UPDATE ON post_creator_posts FOR EACH ROW EXECUTE FUNCTION update_post_creator_updated_at_column();
CREATE TRIGGER update_post_creator_templates_updated_at BEFORE UPDATE ON post_creator_templates FOR EACH ROW EXECUTE FUNCTION update_post_creator_updated_at_column();

-- Create a function to increment usage counters
CREATE OR REPLACE FUNCTION increment_post_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.times_copied IS DISTINCT FROM NEW.times_copied THEN
        NEW.times_copied = COALESCE(OLD.times_copied, 0) + 1;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.times_shared IS DISTINCT FROM NEW.times_shared THEN
        NEW.times_shared = COALESCE(OLD.times_shared, 0) + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_post_usage
    BEFORE UPDATE ON post_creator_posts
    FOR EACH ROW
    EXECUTE FUNCTION increment_post_usage();

-- Create a function to calculate voice match score based on content analysis
CREATE OR REPLACE FUNCTION calculate_voice_match_score(
    p_content TEXT,
    p_voice_profile JSONB
) RETURNS DECIMAL(3,2) AS $$
DECLARE
    score DECIMAL(3,2) := 0.5; -- Base score
    common_phrases JSONB;
    writing_style JSONB;
    phrase_count INTEGER := 0;
    total_phrases INTEGER := 0;
BEGIN
    -- Extract voice profile elements
    common_phrases := p_voice_profile->'common_phrases';
    writing_style := p_voice_profile->'writing_style';
    
    -- Check for common phrases
    IF common_phrases IS NOT NULL THEN
        total_phrases := jsonb_array_length(common_phrases);
        FOR i IN 0..total_phrases-1 LOOP
            IF p_content ILIKE '%' || (common_phrases->i)::text || '%' THEN
                phrase_count := phrase_count + 1;
            END IF;
        END LOOP;
        
        -- Add score based on phrase matches
        IF total_phrases > 0 THEN
            score := score + (phrase_count::DECIMAL / total_phrases::DECIMAL) * 0.3;
        END IF;
    END IF;
    
    -- Check writing style characteristics
    IF writing_style IS NOT NULL THEN
        -- Add score for tone matching (simplified)
        score := score + 0.1;
        
        -- Add score for sentence length matching (simplified)
        score := score + 0.1;
    END IF;
    
    -- Ensure score is between 0.0 and 1.0
    RETURN GREATEST(0.0, LEAST(1.0, score));
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate engagement score based on content characteristics
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    p_content TEXT,
    p_platform TEXT,
    p_hashtags JSONB,
    p_call_to_action TEXT
) RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 5; -- Base score
    content_length INTEGER;
    hashtag_count INTEGER;
BEGIN
    -- Calculate content length
    content_length := LENGTH(p_content);
    
    -- Score based on content length (optimal length varies by platform)
    CASE p_platform
        WHEN 'twitter' THEN
            IF content_length BETWEEN 80 AND 120 THEN
                score := score + 2;
            ELSIF content_length BETWEEN 60 AND 140 THEN
                score := score + 1;
            END IF;
        WHEN 'linkedin' THEN
            IF content_length BETWEEN 150 AND 300 THEN
                score := score + 2;
            ELSIF content_length BETWEEN 100 AND 400 THEN
                score := score + 1;
            END IF;
        WHEN 'facebook' THEN
            IF content_length BETWEEN 100 AND 250 THEN
                score := score + 2;
            ELSIF content_length BETWEEN 80 AND 300 THEN
                score := score + 1;
            END IF;
        WHEN 'instagram' THEN
            IF content_length BETWEEN 80 AND 200 THEN
                score := score + 2;
            ELSIF content_length BETWEEN 60 AND 250 THEN
                score := score + 1;
            END IF;
    END CASE;
    
    -- Add score for hashtags
    IF p_hashtags IS NOT NULL THEN
        hashtag_count := jsonb_array_length(p_hashtags);
        IF hashtag_count BETWEEN 3 AND 8 THEN
            score := score + 1;
        ELSIF hashtag_count BETWEEN 1 AND 10 THEN
            score := score + 0;
        ELSE
            score := score - 1;
        END IF;
    END IF;
    
    -- Add score for call to action
    IF p_call_to_action IS NOT NULL AND LENGTH(p_call_to_action) > 10 THEN
        score := score + 1;
    END IF;
    
    -- Add score for question marks (engagement indicator)
    IF p_content LIKE '%?%' THEN
        score := score + 1;
    END IF;
    
    -- Ensure score is between 1 and 10
    RETURN GREATEST(1, LEAST(10, score));
END;
$$ LANGUAGE plpgsql;
