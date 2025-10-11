-- Create sign-in streak trophies system (CLEAN VERSION)
-- This rewards users for daily sign-ins with incremental streak trophies

-- Drop existing policies if they exist
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view sign-in streak trophies" ON signin_streak_trophies;
    DROP POLICY IF EXISTS "Users can view their own sign-in streaks" ON user_signin_streaks;
    DROP POLICY IF EXISTS "Users can insert their own sign-in streaks" ON user_signin_streaks;
    DROP POLICY IF EXISTS "Users can update their own sign-in streaks" ON user_signin_streaks;
    DROP POLICY IF EXISTS "Users can view their own sign-in streak trophies" ON user_signin_streak_trophies;
    DROP POLICY IF EXISTS "Users can insert their own sign-in streak trophies" ON user_signin_streak_trophies;
    DROP POLICY IF EXISTS "Users can view their own sign-in logs" ON daily_signin_logs;
    DROP POLICY IF EXISTS "Users can insert their own sign-in logs" ON daily_signin_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create sign-in streak trophies table
CREATE TABLE IF NOT EXISTS signin_streak_trophies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    streak_days_required INT NOT NULL,
    essence_description TEXT,
    reflection_message TEXT,
    icon_name VARCHAR(50),
    color VARCHAR(7),
    background_gradient TEXT,
    sound_cue VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user sign-in streaks table to track daily sign-ins
CREATE TABLE IF NOT EXISTS user_signin_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_signin_date DATE,
    total_signins INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id) -- One record per user
);

-- Create user sign-in streak trophies table to track earned trophies
CREATE TABLE IF NOT EXISTS user_signin_streak_trophies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trophy_id UUID NOT NULL REFERENCES signin_streak_trophies(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, trophy_id) -- Prevent duplicate trophies
);

-- Create daily sign-in log table for detailed tracking
CREATE TABLE IF NOT EXISTS daily_signin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    signin_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, signin_date) -- One sign-in per user per day
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_signin_streaks_user_id ON user_signin_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_signin_streak_trophies_user_id ON user_signin_streak_trophies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_signin_streak_trophies_trophy_id ON user_signin_streak_trophies(trophy_id);
CREATE INDEX IF NOT EXISTS idx_daily_signin_logs_user_id ON daily_signin_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_signin_logs_date ON daily_signin_logs(signin_date);

-- Enable RLS on all tables
ALTER TABLE signin_streak_trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_signin_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_signin_streak_trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_signin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for signin_streak_trophies (public read)
CREATE POLICY "Anyone can view sign-in streak trophies" ON signin_streak_trophies
    FOR SELECT USING (true);

-- RLS Policies for user_signin_streaks
CREATE POLICY "Users can view their own sign-in streaks" ON user_signin_streaks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sign-in streaks" ON user_signin_streaks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sign-in streaks" ON user_signin_streaks
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_signin_streak_trophies
CREATE POLICY "Users can view their own sign-in streak trophies" ON user_signin_streak_trophies
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sign-in streak trophies" ON user_signin_streak_trophies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_signin_logs
CREATE POLICY "Users can view their own sign-in logs" ON daily_signin_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sign-in logs" ON daily_signin_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert sign-in streak trophies with incremental requirements (only if not already present)
INSERT INTO signin_streak_trophies (name, description, streak_days_required, essence_description, reflection_message, icon_name, color, background_gradient, sound_cue) 
SELECT * FROM (VALUES
    ('The First Light', 'You have taken the first step on your daily journey. The path of consistency begins with awareness.', 1, 'The awakening of daily commitment', 'Every master was once a beginner. Your journey of daily presence begins now.', 'Sunrise', '#FFD700', 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', 'chime'),
    ('The Dedicated Visitor', 'Two days of showing up. You are building the foundation of reliability.', 2, 'Consistency begins to take root', 'Two days in a row. The seed of discipline has been planted.', 'Calendar', '#4A90E2', 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)', 'bell'),
    ('The Steady Presence', 'Three days of commitment. You are proving to yourself that you can be counted on.', 3, 'Your presence becomes predictable', 'Three days strong. You are becoming someone you can depend on.', 'Target', '#8B4513', 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)', 'ding'),
    ('The Weekly Warrior', 'Seven days of dedication. You have completed a full week of showing up.', 7, 'A full week of unbroken commitment', 'Seven days. A complete cycle. Your dedication is becoming a rhythm.', 'Star', '#9B59B6', 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)', 'chime'),
    ('The Fortnight Faithful', 'Fourteen days of consistency. You are building something real.', 14, 'Two weeks of unbroken daily presence', 'Fourteen days. You are no longer trying—you are doing.', 'Shield', '#34495E', 'linear-gradient(135deg, #34495E 0%, #2C3E50 100%)', 'gong'),
    ('The Monthly Master', 'Thirty days of showing up. You have formed a true habit of presence.', 30, 'A full month of daily commitment', 'Thirty days. You have proven that consistency is not just possible—it is your nature.', 'Crown', '#1ABC9C', 'linear-gradient(135deg, #1ABC9C 0%, #16A085 100%)', 'fanfare'),
    ('The Quarter Champion', 'Ninety days of dedication. You are now a master of daily presence.', 90, 'Three months of unbroken daily commitment', 'Ninety days. You have transcended motivation—you have become discipline itself.', 'Trophy', '#F39C12', 'linear-gradient(135deg, #F39C12 0%, #E67E22 100%)', 'victory'),
    ('The Yearly Sage', 'Three hundred and sixty-five days of showing up. You are the embodiment of consistency.', 365, 'A full year of unbroken daily presence', 'Three hundred and sixty-five days. You are no longer practicing consistency—you are its living example.', 'Lotus', '#E74C3C', 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)', 'celebration')
) AS v(name, description, streak_days_required, essence_description, reflection_message, icon_name, color, background_gradient, sound_cue)
WHERE NOT EXISTS (
    SELECT 1 FROM signin_streak_trophies WHERE signin_streak_trophies.streak_days_required = v.streak_days_required
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_signin_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_signin_streak_trophies_updated_at ON signin_streak_trophies;
DROP TRIGGER IF EXISTS update_user_signin_streaks_updated_at ON user_signin_streaks;

-- Create triggers for updated_at
CREATE TRIGGER update_signin_streak_trophies_updated_at
    BEFORE UPDATE ON signin_streak_trophies
    FOR EACH ROW EXECUTE FUNCTION update_signin_updated_at_column();

CREATE TRIGGER update_user_signin_streaks_updated_at
    BEFORE UPDATE ON user_signin_streaks
    FOR EACH ROW EXECUTE FUNCTION update_signin_updated_at_column();

-- Verify the setup
SELECT 'Sign-in streak trophies created:' as status, COUNT(*) as count FROM signin_streak_trophies;
