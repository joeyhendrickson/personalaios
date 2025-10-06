CREATE TABLE IF NOT EXISTS discipline_trophies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  habit_count_required INT NOT NULL,
  essence_description TEXT NOT NULL,
  reflection_message TEXT NOT NULL,
  icon_name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL,
  background_gradient VARCHAR(100),
  sound_cue VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE discipline_trophies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to discipline_trophies" ON discipline_trophies FOR SELECT USING (TRUE);

CREATE TABLE IF NOT EXISTS user_discipline_trophies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trophy_id UUID REFERENCES discipline_trophies(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES daily_habits(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trophy_id, habit_id)
);

ALTER TABLE user_discipline_trophies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own discipline_trophies" ON user_discipline_trophies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own discipline_trophies" ON user_discipline_trophies FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS habit_completion_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES daily_habits(id) ON DELETE CASCADE NOT NULL,
  completion_count INT NOT NULL DEFAULT 0,
  last_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, habit_id)
);

ALTER TABLE habit_completion_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own habit_completion_counts" ON habit_completion_counts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own habit_completion_counts" ON habit_completion_counts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own habit_completion_counts" ON habit_completion_counts FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_discipline_trophies_user_id ON user_discipline_trophies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_discipline_trophies_habit_id ON user_discipline_trophies(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completion_counts_user_id ON habit_completion_counts(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completion_counts_habit_id ON habit_completion_counts(habit_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discipline_trophies_updated_at
BEFORE UPDATE ON discipline_trophies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_discipline_trophies_updated_at
BEFORE UPDATE ON user_discipline_trophies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habit_completion_counts_updated_at
BEFORE UPDATE ON habit_completion_counts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO discipline_trophies (name, description, habit_count_required, essence_description, reflection_message, icon_name, color, background_gradient, sound_cue) VALUES
('The Initiate of Intention', 'You''ve awakened the spark — awareness that your actions create your path.', 5, 'The first step on the path of disciplined spirit', 'Discipline begins not with control, but with awareness.', 'Candle', '#FFD700', 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', 'chime'),
('The Keeper of Focus', 'You guard your time and energy — attention becomes sacred.', 10, 'Attention becomes your most precious resource', 'What you guard with attention, you grow with love.', 'Eye', '#4A90E2', 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)', 'gong'),
('The Grounded Seeker', 'You''ve built roots in your practice — stability and presence deepen.', 20, 'Your practice has taken root in daily life', 'Roots of discipline reach deeper than motivation.', 'TreePine', '#8B4513', 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)', 'wind'),
('The Harmonized Mind', 'Discipline aligns thought, word, and deed — the inner self unites.', 30, 'Thought, word, and deed now move as one', 'Your thoughts, words, and actions now sing the same note.', 'Circle', '#9B59B6', 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)', 'chime'),
('The Silent Warrior', 'Strength through stillness — you act without noise, lead without force.', 40, 'True strength flows through quiet determination', 'True strength whispers; it does not shout.', 'Mountain', '#34495E', 'linear-gradient(135deg, #34495E 0%, #2C3E50 100%)', 'gong'),
('The Guardian of Rhythm', 'You now move in sync with your habits — your discipline dances with flow.', 50, 'Your habits have become a natural rhythm', 'You no longer chase flow — you have become it.', 'Wave', '#1ABC9C', 'linear-gradient(135deg, #1ABC9C 0%, #16A085 100%)', 'wind'),
('The Illuminated Soul', 'Habit is devotion — every act is prayer in motion.', 75, 'Each action becomes a sacred practice', 'Discipline has transformed into devotion.', 'Sun', '#F39C12', 'linear-gradient(135deg, #F39C12 0%, #E67E22 100%)', 'chime'),
('The Sage of Discipline', 'You''ve mastered the self — body, mind, and purpose act as one.', 100, 'You have become the embodiment of disciplined spirit', 'You are no longer practicing discipline — you are its embodiment.', 'Lotus', '#E74C3C', 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)', 'gong');
