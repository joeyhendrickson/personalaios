-- Habit Master Database Schema
-- Incorporates psychological frameworks: CBT, SDT, Atomic Habits, ACT, etc.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habit Categories
CREATE TABLE IF NOT EXISTS habit_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint to habit_categories name column
ALTER TABLE habit_categories ADD CONSTRAINT habit_categories_name_unique UNIQUE (name);

-- Insert default categories
INSERT INTO habit_categories (name, description, color, icon) VALUES
('Physical Health', 'Exercise, nutrition, sleep, and physical wellness habits', '#10B981', 'activity'),
('Mental Health', 'Meditation, therapy, stress management, and emotional wellness', '#8B5CF6', 'brain'),
('Productivity', 'Work habits, time management, and professional development', '#F59E0B', 'target'),
('Relationships', 'Social connections, communication, and relationship building', '#EF4444', 'users'),
('Learning', 'Education, skill development, and personal growth', '#3B82F6', 'book-open'),
('Financial', 'Money management, saving, and financial planning', '#059669', 'dollar-sign'),
('Lifestyle', 'Hobbies, leisure, and personal enjoyment', '#EC4899', 'heart'),
('Digital Wellness', 'Screen time, social media, and technology balance', '#6366F1', 'smartphone')
ON CONFLICT (name) DO NOTHING;

-- Core Habits Table
CREATE TABLE IF NOT EXISTS habit_master_habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES habit_categories(id),
  habit_type VARCHAR(20) CHECK (habit_type IN ('positive', 'negative')) NOT NULL,
  
  -- Atomic Habits Framework
  cue_description TEXT,
  craving_description TEXT,
  response_description TEXT,
  reward_description TEXT,
  
  -- Implementation Intentions (If-Then Planning)
  if_then_plan TEXT,
  
  -- ACT Framework
  personal_value TEXT,
  committed_action TEXT,
  
  -- Keystone Habit
  is_keystone BOOLEAN DEFAULT FALSE,
  keystone_impact TEXT,
  
  -- CBT Framework
  automatic_thought TEXT,
  cognitive_distortion TEXT,
  reframe_statement TEXT,
  
  -- Transtheoretical Model (Stages of Change)
  stage_of_change VARCHAR(20) CHECK (stage_of_change IN ('precontemplation', 'contemplation', 'preparation', 'action', 'maintenance')) DEFAULT 'precontemplation',
  
  -- SDT Framework
  autonomy_score INTEGER CHECK (autonomy_score >= 1 AND autonomy_score <= 10),
  competence_score INTEGER CHECK (competence_score >= 1 AND competence_score <= 10),
  relatedness_score INTEGER CHECK (relatedness_score >= 1 AND relatedness_score <= 10),
  
  -- Gamification
  points_per_completion INTEGER DEFAULT 10,
  streak_bonus_points INTEGER DEFAULT 5,
  difficulty_level VARCHAR(10) CHECK (difficulty_level IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  
  -- Social Features
  is_public BOOLEAN DEFAULT FALSE,
  share_achievements BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Habit Completions
CREATE TABLE IF NOT EXISTS habit_master_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID REFERENCES habit_master_habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completion_date DATE NOT NULL,
  notes TEXT,
  
  -- CBT Reflection
  automatic_thought TEXT,
  emotion_before VARCHAR(50),
  emotion_after VARCHAR(50),
  cognitive_reframe TEXT,
  
  -- SDT Reflection
  autonomy_feeling INTEGER CHECK (autonomy_feeling >= 1 AND autonomy_feeling <= 10),
  competence_feeling INTEGER CHECK (competence_feeling >= 1 AND competence_feeling <= 10),
  relatedness_feeling INTEGER CHECK (relatedness_feeling >= 1 AND relatedness_feeling <= 10),
  
  -- Implementation Intention Success
  if_then_applied BOOLEAN DEFAULT FALSE,
  if_then_effectiveness INTEGER CHECK (if_then_effectiveness >= 1 AND if_then_effectiveness <= 10),
  
  points_earned INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habit Streaks
CREATE TABLE IF NOT EXISTS habit_master_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID REFERENCES habit_master_habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completion_date DATE,
  streak_start_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social Features Tables

-- Habit Challenges (Community Challenges)
CREATE TABLE IF NOT EXISTS habit_master_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES habit_categories(id),
  duration_days INTEGER DEFAULT 30,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenge Participants
CREATE TABLE IF NOT EXISTS habit_master_challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES habit_master_challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES habit_master_habits(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(challenge_id, user_id, habit_id)
);

-- Social Celebrations (Notifications of others' achievements)
CREATE TABLE IF NOT EXISTS habit_master_celebrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  celebrator_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  celebrated_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES habit_master_habits(id) ON DELETE CASCADE NOT NULL,
  celebration_type VARCHAR(20) CHECK (celebration_type IN ('streak', 'milestone', 'completion', 'challenge_win')) NOT NULL,
  message TEXT,
  points_awarded INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Top Performers (Leaderboards)
CREATE TABLE IF NOT EXISTS habit_master_leaderboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES habit_categories(id),
  total_completions INTEGER DEFAULT 0,
  total_streaks INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  week_completions INTEGER DEFAULT 0,
  month_completions INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

-- Habit Insights (AI-powered insights)
CREATE TABLE IF NOT EXISTS habit_master_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES habit_master_habits(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  is_positive BOOLEAN DEFAULT TRUE,
  action_suggestion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habit Templates (Pre-built habits based on psychological frameworks)
CREATE TABLE IF NOT EXISTS habit_master_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES habit_categories(id),
  habit_type VARCHAR(20) CHECK (habit_type IN ('positive', 'negative')) NOT NULL,
  framework VARCHAR(50),
  
  -- Template content
  cue_description TEXT,
  craving_description TEXT,
  response_description TEXT,
  reward_description TEXT,
  if_then_plan TEXT,
  personal_value TEXT,
  committed_action TEXT,
  is_keystone BOOLEAN DEFAULT FALSE,
  keystone_impact TEXT,
  
  -- Default settings
  points_per_completion INTEGER DEFAULT 10,
  difficulty_level VARCHAR(10) CHECK (difficulty_level IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert some template habits based on psychological frameworks
INSERT INTO habit_master_templates (title, description, category_id, habit_type, framework, cue_description, craving_description, response_description, reward_description, if_then_plan, personal_value, committed_action, is_keystone, points_per_completion, difficulty_level) VALUES
('Morning Meditation', 'Start your day with mindfulness and intention', (SELECT id FROM habit_categories WHERE name = 'Mental Health'), 'positive', 'ACT', 'When I wake up', 'I want to feel centered and peaceful', 'I will meditate for 10 minutes', 'I will feel calm and ready for the day', 'If I wake up feeling stressed, then I will meditate for 10 minutes', 'Inner peace and self-awareness', 'I commit to daily meditation practice', TRUE, 15, 'easy'),

('Digital Sunset', 'Wind down without screens before bed', (SELECT id FROM habit_categories WHERE name = 'Digital Wellness'), 'positive', 'Atomic Habits', 'When it''s 9 PM', 'I want to feel relaxed and sleepy', 'I will put away all devices and read a book', 'I will fall asleep faster and sleep better', 'If I feel the urge to check my phone after 9 PM, then I will read a book instead', 'Quality rest and mental clarity', 'I commit to a screen-free bedtime routine', TRUE, 20, 'medium'),

('Gratitude Journaling', 'Reflect on positive moments each day', (SELECT id FROM habit_categories WHERE name = 'Mental Health'), 'positive', 'CBT', 'When I sit down for dinner', 'I want to feel appreciative and positive', 'I will write down 3 things I''m grateful for', 'I will feel more optimistic and content', 'If I start feeling negative, then I will write in my gratitude journal', 'Positivity and appreciation', 'I commit to daily gratitude practice', FALSE, 10, 'easy'),

('Social Media Time Limit', 'Limit social media to 30 minutes per day', (SELECT id FROM habit_categories WHERE name = 'Digital Wellness'), 'negative', 'Implementation Intentions', 'When I feel bored or lonely', 'I want connection and stimulation', 'I will check my time limit app and do something else', 'I will feel more present and productive', 'If I feel like scrolling social media, then I will call a friend instead', 'Authentic connection and presence', 'I commit to mindful social media use', TRUE, 25, 'hard');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habit_master_habits_user_id ON habit_master_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_master_habits_category_id ON habit_master_habits(category_id);
CREATE INDEX IF NOT EXISTS idx_habit_master_habits_type ON habit_master_habits(habit_type);
CREATE INDEX IF NOT EXISTS idx_habit_master_habits_keystone ON habit_master_habits(is_keystone);

CREATE INDEX IF NOT EXISTS idx_habit_master_completions_habit_id ON habit_master_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_master_completions_user_id ON habit_master_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_master_completions_date ON habit_master_completions(completion_date);

CREATE INDEX IF NOT EXISTS idx_habit_master_streaks_habit_id ON habit_master_streaks(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_master_streaks_user_id ON habit_master_streaks(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE habit_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_master_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_master_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_master_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_master_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_master_challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_master_celebrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_master_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_master_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_master_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habit_categories (public read)
CREATE POLICY "Anyone can view habit categories" ON habit_categories FOR SELECT USING (true);

-- RLS Policies for habit_master_habits
CREATE POLICY "Users can view their own habits" ON habit_master_habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public habits" ON habit_master_habits FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert their own habits" ON habit_master_habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own habits" ON habit_master_habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own habits" ON habit_master_habits FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for habit_master_completions
CREATE POLICY "Users can view their own completions" ON habit_master_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own completions" ON habit_master_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own completions" ON habit_master_completions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own completions" ON habit_master_completions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for habit_master_streaks
CREATE POLICY "Users can view their own streaks" ON habit_master_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own streaks" ON habit_master_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own streaks" ON habit_master_streaks FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for habit_master_challenges (public read for active challenges)
CREATE POLICY "Anyone can view active challenges" ON habit_master_challenges FOR SELECT USING (is_active = true);
CREATE POLICY "Users can insert challenges" ON habit_master_challenges FOR INSERT WITH CHECK (auth.uid() = created_by);

-- RLS Policies for habit_master_challenge_participants
CREATE POLICY "Users can view challenge participants" ON habit_master_challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON habit_master_challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave challenges" ON habit_master_challenge_participants FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for habit_master_celebrations
CREATE POLICY "Users can view celebrations involving them" ON habit_master_celebrations FOR SELECT USING (auth.uid() = celebrated_user_id OR auth.uid() = celebrator_user_id);
CREATE POLICY "Users can create celebrations" ON habit_master_celebrations FOR INSERT WITH CHECK (auth.uid() = celebrator_user_id);

-- RLS Policies for habit_master_leaderboards (public read for social features)
CREATE POLICY "Anyone can view leaderboards" ON habit_master_leaderboards FOR SELECT USING (true);
CREATE POLICY "Users can update their own leaderboard entries" ON habit_master_leaderboards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own leaderboard entries" ON habit_master_leaderboards FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for habit_master_insights
CREATE POLICY "Users can view their own insights" ON habit_master_insights FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for habit_master_templates (public read)
CREATE POLICY "Anyone can view active templates" ON habit_master_templates FOR SELECT USING (is_active = true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_habit_master_habits_updated_at BEFORE UPDATE ON habit_master_habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_habit_master_streaks_updated_at BEFORE UPDATE ON habit_master_streaks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_habit_master_leaderboards_updated_at BEFORE UPDATE ON habit_master_leaderboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
