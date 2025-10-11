-- Create total habit completion trophies system (CLEAN VERSION)
-- This rewards users for their cumulative habit completions across all habits

-- Drop existing policies if they exist
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view total habit trophies" ON total_habit_trophies;
    DROP POLICY IF EXISTS "Users can view their own total habit trophies" ON user_total_habit_trophies;
    DROP POLICY IF EXISTS "Users can insert their own total habit trophies" ON user_total_habit_trophies;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create total habit completion trophies table
CREATE TABLE IF NOT EXISTS total_habit_trophies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    total_completions_required INT NOT NULL,
    essence_description TEXT,
    reflection_message TEXT,
    icon_name VARCHAR(50),
    color VARCHAR(7),
    background_gradient TEXT,
    sound_cue VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user total habit trophies table to track earned trophies
CREATE TABLE IF NOT EXISTS user_total_habit_trophies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trophy_id UUID NOT NULL REFERENCES total_habit_trophies(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_completions_at_time INT NOT NULL, -- Track how many completions they had when they earned it
    
    UNIQUE(user_id, trophy_id) -- Prevent duplicate trophies
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_total_habit_trophies_user_id ON user_total_habit_trophies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_total_habit_trophies_trophy_id ON user_total_habit_trophies(trophy_id);

-- Enable RLS on all tables
ALTER TABLE total_habit_trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_total_habit_trophies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for total_habit_trophies (public read)
CREATE POLICY "Anyone can view total habit trophies" ON total_habit_trophies
    FOR SELECT USING (true);

-- RLS Policies for user_total_habit_trophies
CREATE POLICY "Users can view their own total habit trophies" ON user_total_habit_trophies
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own total habit trophies" ON user_total_habit_trophies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert total habit completion trophies with incremental requirements (only if not already present)
INSERT INTO total_habit_trophies (name, description, total_completions_required, essence_description, reflection_message, icon_name, color, background_gradient, sound_cue) 
SELECT * FROM (VALUES
    ('The First Mark', 'You have completed your first habit. The journey of a thousand completions begins with one.', 1, 'The very first step', 'One completion. One choice. One step forward. This is how legends begin.', 'Sparkles', '#FFD700', 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', 'chime'),
    ('The Eager Builder', 'Five habit completions. You are building momentum.', 5, 'The foundation is being laid', 'Five completions. You are proving to yourself that change is possible.', 'Hammer', '#4A90E2', 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)', 'bell'),
    ('The Consistent One', 'Ten habit completions. Consistency is becoming your signature.', 10, 'The rhythm of progress', 'Ten completions. You are no longer just trying—you are doing.', 'Target', '#8B4513', 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)', 'ding'),
    ('The Dedicated Worker', 'Twenty-five habit completions. Your dedication is undeniable.', 25, 'The power of persistent action', 'Twenty-five completions. Your habits are becoming your identity.', 'Briefcase', '#9B59B6', 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)', 'chime'),
    ('The Habit Champion', 'Fifty habit completions. You are a champion of daily action.', 50, 'The milestone of mastery begins', 'Fifty completions. You have crossed the threshold from beginner to practitioner.', 'Medal', '#34495E', 'linear-gradient(135deg, #34495E 0%, #2C3E50 100%)', 'fanfare'),
    ('The Centennial Master', 'One hundred habit completions. You have achieved a significant milestone of consistency.', 100, 'A hundred steps forward', 'One hundred completions. This is not luck. This is discipline in action.', 'Award', '#1ABC9C', 'linear-gradient(135deg, #1ABC9C 0%, #16A085 100%)', 'victory'),
    ('The Relentless Spirit', 'Two hundred and fifty habit completions. Your spirit is relentless and your commitment is unwavering.', 250, 'The forging of an unbreakable will', 'Two hundred and fifty completions. You are becoming unstoppable.', 'Flame', '#F39C12', 'linear-gradient(135deg, #F39C12 0%, #E67E22 100%)', 'celebration'),
    ('The Legendary Achiever', 'Five hundred habit completions. You have achieved legendary status in the art of consistency.', 500, 'The realm of the extraordinary', 'Five hundred completions. You are not just completing habits—you are becoming a force of nature.', 'Crown', '#E74C3C', 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)', 'fanfare'),
    ('The Mythic Master', 'One thousand habit completions. You have transcended ordinary achievement and entered the realm of mastery.', 1000, 'The pinnacle of habit mastery', 'One thousand completions. You are a living testament to the power of daily action.', 'Star', '#8E44AD', 'linear-gradient(135deg, #8E44AD 0%, #9B59B6 100%)', 'epic'),
    ('The Eternal Sage', 'Two thousand habit completions. You are the embodiment of consistency itself.', 2000, 'The transcendence of discipline', 'Two thousand completions. You have become what others aspire to be.', 'Lotus', '#16A085', 'linear-gradient(135deg, #16A085 0%, #1ABC9C 100%)', 'legendary')
) AS v(name, description, total_completions_required, essence_description, reflection_message, icon_name, color, background_gradient, sound_cue)
WHERE NOT EXISTS (
    SELECT 1 FROM total_habit_trophies WHERE total_habit_trophies.total_completions_required = v.total_completions_required
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_total_habit_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_total_habit_trophies_updated_at ON total_habit_trophies;

-- Create trigger for updated_at
CREATE TRIGGER update_total_habit_trophies_updated_at
    BEFORE UPDATE ON total_habit_trophies
    FOR EACH ROW EXECUTE FUNCTION update_total_habit_updated_at_column();

-- Verify the setup
SELECT 'Total habit trophies created:' as status, COUNT(*) as count FROM total_habit_trophies;
