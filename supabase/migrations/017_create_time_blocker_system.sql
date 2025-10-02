-- Create time blocker system tables
-- This migration creates tables for time blocking, brainstorming sessions, and AI-powered discussions

-- Discussion topics and brainstorming sessions
CREATE TABLE IF NOT EXISTS discussion_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'business', 'creative', 'personal', 'academic', 'philosophical', 'technical', 'social')),
    difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert')),
    estimated_duration_minutes INTEGER DEFAULT 30,
    tags TEXT[],
    is_ai_generated BOOLEAN DEFAULT FALSE,
    parent_topic_id UUID REFERENCES discussion_topics(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ice breaker questions for topics
CREATE TABLE IF NOT EXISTS ice_breaker_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id UUID NOT NULL REFERENCES discussion_topics(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type TEXT DEFAULT 'open_ended' CHECK (question_type IN ('open_ended', 'multiple_choice', 'scenario', 'hypothetical', 'personal', 'analytical')),
    difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert')),
    expected_response_time_minutes INTEGER DEFAULT 5,
    follow_up_questions TEXT[],
    is_ai_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time-blocked discussion sessions
CREATE TABLE IF NOT EXISTS discussion_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES discussion_topics(id) ON DELETE CASCADE,
    session_name TEXT NOT NULL,
    time_limit_minutes INTEGER NOT NULL DEFAULT 30,
    actual_duration_minutes INTEGER,
    session_type TEXT DEFAULT 'brainstorming' CHECK (session_type IN ('brainstorming', 'deep_dive', 'exploration', 'analysis', 'creative', 'problem_solving')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'paused', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    ai_insights JSONB,
    session_conclusion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discussion messages and AI interactions
CREATE TABLE IF NOT EXISTS discussion_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES discussion_sessions(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai', 'system', 'ice_breaker', 'conclusion')),
    content TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'assistant', 'system')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_seconds INTEGER,
    message_metadata JSONB,
    parent_message_id UUID REFERENCES discussion_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI-generated topic recommendations
CREATE TABLE IF NOT EXISTS topic_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_session_id UUID REFERENCES discussion_sessions(id) ON DELETE CASCADE,
    source_topic_id UUID REFERENCES discussion_topics(id) ON DELETE CASCADE,
    recommended_topic_id UUID REFERENCES discussion_topics(id) ON DELETE CASCADE,
    recommendation_reason TEXT NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    recommendation_type TEXT DEFAULT 'branch' CHECK (recommendation_type IN ('branch', 'related', 'opposite', 'deeper', 'broader')),
    is_accepted BOOLEAN DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time blocking calendar events
CREATE TABLE IF NOT EXISTS time_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES discussion_sessions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    block_type TEXT DEFAULT 'discussion' CHECK (block_type IN ('discussion', 'brainstorming', 'deep_work', 'meeting', 'break', 'other')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled', 'rescheduled')),
    location TEXT,
    attendees TEXT[],
    preparation_notes TEXT,
    follow_up_actions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discussion insights and learnings
CREATE TABLE IF NOT EXISTS discussion_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES discussion_sessions(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('key_takeaway', 'action_item', 'follow_up_topic', 'connection', 'pattern', 'contradiction', 'question')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    importance_score INTEGER CHECK (importance_score >= 1 AND importance_score <= 10),
    category TEXT,
    tags TEXT[],
    is_ai_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences for time blocking and discussions
CREATE TABLE IF NOT EXISTS time_blocker_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    default_session_duration INTEGER DEFAULT 30,
    preferred_discussion_times TEXT[],
    notification_reminders BOOLEAN DEFAULT TRUE,
    reminder_minutes_before INTEGER DEFAULT 5,
    auto_generate_ice_breakers BOOLEAN DEFAULT TRUE,
    ai_assistance_level TEXT DEFAULT 'moderate' CHECK (ai_assistance_level IN ('minimal', 'moderate', 'high', 'maximal')),
    preferred_categories TEXT[],
    discussion_style TEXT DEFAULT 'collaborative' CHECK (discussion_style IN ('collaborative', 'challenging', 'supportive', 'analytical', 'creative')),
    time_zone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Discussion templates and frameworks
CREATE TABLE IF NOT EXISTS discussion_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    framework_structure JSONB NOT NULL,
    estimated_duration_minutes INTEGER DEFAULT 30,
    difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert')),
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discussion_topics_user_id ON discussion_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_topics_category ON discussion_topics(category);
CREATE INDEX IF NOT EXISTS idx_discussion_topics_parent_topic_id ON discussion_topics(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_discussion_topics_created_at ON discussion_topics(created_at);

CREATE INDEX IF NOT EXISTS idx_ice_breaker_questions_topic_id ON ice_breaker_questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_ice_breaker_questions_type ON ice_breaker_questions(question_type);

CREATE INDEX IF NOT EXISTS idx_discussion_sessions_user_id ON discussion_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_sessions_topic_id ON discussion_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_discussion_sessions_status ON discussion_sessions(status);
CREATE INDEX IF NOT EXISTS idx_discussion_sessions_started_at ON discussion_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_discussion_messages_session_id ON discussion_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_discussion_messages_timestamp ON discussion_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_discussion_messages_type ON discussion_messages(message_type);

CREATE INDEX IF NOT EXISTS idx_topic_recommendations_user_id ON topic_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_recommendations_source_session_id ON topic_recommendations(source_session_id);
CREATE INDEX IF NOT EXISTS idx_topic_recommendations_confidence_score ON topic_recommendations(confidence_score);

CREATE INDEX IF NOT EXISTS idx_time_blocks_user_id ON time_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_start_time ON time_blocks(start_time);
CREATE INDEX IF NOT EXISTS idx_time_blocks_status ON time_blocks(status);
CREATE INDEX IF NOT EXISTS idx_time_blocks_type ON time_blocks(block_type);

CREATE INDEX IF NOT EXISTS idx_discussion_insights_session_id ON discussion_insights(session_id);
CREATE INDEX IF NOT EXISTS idx_discussion_insights_type ON discussion_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_discussion_insights_importance_score ON discussion_insights(importance_score);

CREATE INDEX IF NOT EXISTS idx_time_blocker_preferences_user_id ON time_blocker_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_discussion_templates_category ON discussion_templates(category);
CREATE INDEX IF NOT EXISTS idx_discussion_templates_public ON discussion_templates(is_public);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_discussion_topics_updated_at BEFORE UPDATE ON discussion_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ice_breaker_questions_updated_at BEFORE UPDATE ON ice_breaker_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discussion_sessions_updated_at BEFORE UPDATE ON discussion_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discussion_messages_updated_at BEFORE UPDATE ON discussion_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_topic_recommendations_updated_at BEFORE UPDATE ON topic_recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_blocks_updated_at BEFORE UPDATE ON time_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discussion_insights_updated_at BEFORE UPDATE ON discussion_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_blocker_preferences_updated_at BEFORE UPDATE ON time_blocker_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discussion_templates_updated_at BEFORE UPDATE ON discussion_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE discussion_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ice_breaker_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocker_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own discussion topics" ON discussion_topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own discussion topics" ON discussion_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own discussion topics" ON discussion_topics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own discussion topics" ON discussion_topics FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view ice breakers for their topics" ON ice_breaker_questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM discussion_topics WHERE id = ice_breaker_questions.topic_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert ice breakers for their topics" ON ice_breaker_questions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM discussion_topics WHERE id = ice_breaker_questions.topic_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update ice breakers for their topics" ON ice_breaker_questions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM discussion_topics WHERE id = ice_breaker_questions.topic_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete ice breakers for their topics" ON ice_breaker_questions FOR DELETE USING (
    EXISTS (SELECT 1 FROM discussion_topics WHERE id = ice_breaker_questions.topic_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view their own discussion sessions" ON discussion_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own discussion sessions" ON discussion_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own discussion sessions" ON discussion_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own discussion sessions" ON discussion_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages for their sessions" ON discussion_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM discussion_sessions WHERE id = discussion_messages.session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert messages for their sessions" ON discussion_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM discussion_sessions WHERE id = discussion_messages.session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update messages for their sessions" ON discussion_messages FOR UPDATE USING (
    EXISTS (SELECT 1 FROM discussion_sessions WHERE id = discussion_messages.session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete messages for their sessions" ON discussion_messages FOR DELETE USING (
    EXISTS (SELECT 1 FROM discussion_sessions WHERE id = discussion_messages.session_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view their own topic recommendations" ON topic_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own topic recommendations" ON topic_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own topic recommendations" ON topic_recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own topic recommendations" ON topic_recommendations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own time blocks" ON time_blocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own time blocks" ON time_blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own time blocks" ON time_blocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own time blocks" ON time_blocks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view insights for their sessions" ON discussion_insights FOR SELECT USING (
    EXISTS (SELECT 1 FROM discussion_sessions WHERE id = discussion_insights.session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert insights for their sessions" ON discussion_insights FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM discussion_sessions WHERE id = discussion_insights.session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update insights for their sessions" ON discussion_insights FOR UPDATE USING (
    EXISTS (SELECT 1 FROM discussion_sessions WHERE id = discussion_insights.session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete insights for their sessions" ON discussion_insights FOR DELETE USING (
    EXISTS (SELECT 1 FROM discussion_sessions WHERE id = discussion_insights.session_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view their own preferences" ON time_blocker_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON time_blocker_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON time_blocker_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own preferences" ON time_blocker_preferences FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view public discussion templates" ON discussion_templates FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own discussion templates" ON discussion_templates FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can insert their own discussion templates" ON discussion_templates FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update their own discussion templates" ON discussion_templates FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete their own discussion templates" ON discussion_templates FOR DELETE USING (created_by = auth.uid());

-- Insert default discussion templates
INSERT INTO discussion_templates (name, description, category, framework_structure, estimated_duration_minutes, difficulty_level, is_public) VALUES
('Brainstorming Session', 'Open-ended creative exploration', 'creative', 
 '{"phases": ["warm_up", "idea_generation", "evaluation", "synthesis"], "time_allocation": {"warm_up": 5, "idea_generation": 20, "evaluation": 10, "synthesis": 5}}', 
 40, 'easy', true),

('Problem-Solving Framework', 'Structured approach to complex problems', 'analytical', 
 '{"phases": ["problem_definition", "root_cause_analysis", "solution_generation", "evaluation", "implementation"], "time_allocation": {"problem_definition": 10, "root_cause_analysis": 15, "solution_generation": 15, "evaluation": 10, "implementation": 10}}', 
 60, 'medium', true),

('Philosophical Discussion', 'Deep exploration of abstract concepts', 'philosophical', 
 '{"phases": ["concept_introduction", "perspective_exploration", "argument_analysis", "synthesis"], "time_allocation": {"concept_introduction": 10, "perspective_exploration": 25, "argument_analysis": 15, "synthesis": 10}}', 
 60, 'hard', true),

('Business Strategy Session', 'Strategic planning and decision making', 'business', 
 '{"phases": ["situation_analysis", "goal_setting", "strategy_development", "risk_assessment", "action_planning"], "time_allocation": {"situation_analysis": 15, "goal_setting": 10, "strategy_development": 20, "risk_assessment": 10, "action_planning": 15}}', 
 70, 'medium', true),

('Creative Writing Workshop', 'Structured creative expression', 'creative', 
 '{"phases": ["prompt_selection", "free_writing", "peer_review", "revision", "sharing"], "time_allocation": {"prompt_selection": 5, "free_writing": 25, "peer_review": 15, "revision": 10, "sharing": 5}}', 
 60, 'medium', true);

-- Insert sample discussion topics
INSERT INTO discussion_topics (user_id, title, description, category, difficulty_level, estimated_duration_minutes, tags, is_ai_generated) VALUES
('00000000-0000-0000-0000-000000000000', 'The Future of Artificial Intelligence', 'Exploring how AI will shape our world in the next decade', 'technical', 'medium', 45, ARRAY['technology', 'future', 'AI', 'society'], true),
('00000000-0000-0000-0000-000000000000', 'Sustainable Living Practices', 'Discussing practical ways to reduce environmental impact', 'personal', 'easy', 30, ARRAY['environment', 'sustainability', 'lifestyle'], true),
('00000000-0000-0000-0000-000000000000', 'Remote Work vs Office Culture', 'Analyzing the pros and cons of different work environments', 'business', 'medium', 40, ARRAY['work', 'culture', 'productivity'], true),
('00000000-0000-0000-0000-000000000000', 'The Nature of Creativity', 'Exploring what makes us creative and how to nurture it', 'philosophical', 'hard', 50, ARRAY['creativity', 'philosophy', 'psychology'], true),
('00000000-0000-0000-0000-000000000000', 'Digital Privacy in Modern Society', 'Examining the balance between convenience and privacy', 'social', 'medium', 35, ARRAY['privacy', 'technology', 'society'], true);
