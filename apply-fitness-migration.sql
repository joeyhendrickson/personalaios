-- Apply Fitness System Migration (idempotent — safe to re-run)
-- Run in Supabase SQL Editor. Skips objects that already exist.

-- Body analysis and photos table
CREATE TABLE IF NOT EXISTS body_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type TEXT DEFAULT 'front' CHECK (photo_type IN ('front', 'side', 'back')),
    height_inches DECIMAL(5,2),
    weight_lbs DECIMAL(6,2),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analysis_data JSONB,
    target_areas TEXT[],
    body_type_goal TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE body_photos
  ADD COLUMN IF NOT EXISTS height_inches DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS weight_lbs DECIMAL(6,2);

-- Fitness goals and body type preferences
CREATE TABLE IF NOT EXISTS fitness_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('weight_loss', 'muscle_gain', 'endurance', 'strength', 'flexibility', 'body_recomposition', 'general_fitness')),
    target_body_type TEXT,
    target_weight DECIMAL(5,2),
    current_weight DECIMAL(5,2),
    target_body_fat_percentage DECIMAL(4,2),
    current_body_fat_percentage DECIMAL(4,2),
    target_areas TEXT[],
    timeline_weeks INTEGER DEFAULT 12,
    priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high')),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fitness_goals
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Current fitness statistics
CREATE TABLE IF NOT EXISTS fitness_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stat_type TEXT NOT NULL CHECK (stat_type IN ('cardio', 'strength', 'flexibility', 'endurance')),
    exercise_name TEXT NOT NULL,
    measurement_value DECIMAL(8,2),
    measurement_unit TEXT NOT NULL,
    rep_range TEXT,
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout plans
CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('strength', 'cardio', 'hybrid', 'flexibility', 'sport_specific')),
    difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    duration_weeks INTEGER DEFAULT 4,
    frequency_per_week INTEGER DEFAULT 3,
    target_areas TEXT[],
    goals_supported TEXT[],
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    is_ai_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercise database
CREATE TABLE IF NOT EXISTS exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'flexibility', 'sport_specific')),
    muscle_groups TEXT[],
    equipment_needed TEXT[],
    difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    instructions TEXT,
    video_url TEXT,
    image_url TEXT,
    is_compound BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nutrition and diet plans
CREATE TABLE IF NOT EXISTS nutrition_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('weight_loss', 'muscle_gain', 'maintenance', 'performance', 'medical')),
    diet_type TEXT CHECK (diet_type IN ('whole30', 'keto', 'high_protein_vegetarian', 'gluten_free', 'vegan', 'mediterranean', 'pescatarian', 'anti_inflammatory', 'atkins', 'paleo', 'dash', 'low_carb', 'intermittent_fasting', 'flexitarian', 'raw_food')),
    diet_modifications TEXT[],
    daily_calories INTEGER,
    protein_grams INTEGER,
    carbs_grams INTEGER,
    fat_grams INTEGER,
    fiber_grams INTEGER,
    water_liters DECIMAL(4,2),
    meal_frequency INTEGER DEFAULT 3,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    is_ai_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_body_photos_user_id ON body_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_goals_user_id ON fitness_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_goals_completed_at ON fitness_goals(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_fitness_stats_user_id ON fitness_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_stats_recorded_at ON fitness_stats(recorded_at);
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON nutrition_plans(user_id);

-- updated_at helper + triggers (drop first so re-runs succeed)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_body_photos_updated_at ON body_photos;
CREATE TRIGGER update_body_photos_updated_at
  BEFORE UPDATE ON body_photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fitness_goals_updated_at ON fitness_goals;
CREATE TRIGGER update_fitness_goals_updated_at
  BEFORE UPDATE ON fitness_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fitness_stats_updated_at ON fitness_stats;
CREATE TRIGGER update_fitness_stats_updated_at
  BEFORE UPDATE ON fitness_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workout_plans_updated_at ON workout_plans;
CREATE TRIGGER update_workout_plans_updated_at
  BEFORE UPDATE ON workout_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exercises_updated_at ON exercises;
CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nutrition_plans_updated_at ON nutrition_plans;
CREATE TRIGGER update_nutrition_plans_updated_at
  BEFORE UPDATE ON nutrition_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE body_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies (drop + recreate so re-runs succeed)
DROP POLICY IF EXISTS "Users can view their own body photos" ON body_photos;
DROP POLICY IF EXISTS "Users can insert their own body photos" ON body_photos;
DROP POLICY IF EXISTS "Users can update their own body photos" ON body_photos;
DROP POLICY IF EXISTS "Users can delete their own body photos" ON body_photos;
CREATE POLICY "Users can view their own body photos" ON body_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own body photos" ON body_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own body photos" ON body_photos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own body photos" ON body_photos FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own fitness goals" ON fitness_goals;
DROP POLICY IF EXISTS "Users can insert their own fitness goals" ON fitness_goals;
DROP POLICY IF EXISTS "Users can update their own fitness goals" ON fitness_goals;
DROP POLICY IF EXISTS "Users can delete their own fitness goals" ON fitness_goals;
CREATE POLICY "Users can view their own fitness goals" ON fitness_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitness goals" ON fitness_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitness goals" ON fitness_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitness goals" ON fitness_goals FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own fitness stats" ON fitness_stats;
DROP POLICY IF EXISTS "Users can insert their own fitness stats" ON fitness_stats;
DROP POLICY IF EXISTS "Users can update their own fitness stats" ON fitness_stats;
DROP POLICY IF EXISTS "Users can delete their own fitness stats" ON fitness_stats;
CREATE POLICY "Users can view their own fitness stats" ON fitness_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitness stats" ON fitness_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitness stats" ON fitness_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitness stats" ON fitness_stats FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own workout plans" ON workout_plans;
DROP POLICY IF EXISTS "Users can insert their own workout plans" ON workout_plans;
DROP POLICY IF EXISTS "Users can update their own workout plans" ON workout_plans;
DROP POLICY IF EXISTS "Users can delete their own workout plans" ON workout_plans;
CREATE POLICY "Users can view their own workout plans" ON workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own workout plans" ON workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workout plans" ON workout_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workout plans" ON workout_plans FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view exercises" ON exercises;
CREATE POLICY "Everyone can view exercises" ON exercises FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view their own nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Users can insert their own nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Users can update their own nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Users can delete their own nutrition plans" ON nutrition_plans;
CREATE POLICY "Users can view their own nutrition plans" ON nutrition_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own nutrition plans" ON nutrition_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own nutrition plans" ON nutrition_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own nutrition plans" ON nutrition_plans FOR DELETE USING (auth.uid() = user_id);

-- Default exercises (skip duplicates)
INSERT INTO exercises (name, category, muscle_groups, equipment_needed, difficulty_level, instructions, is_compound)
SELECT * FROM (VALUES
('Bench Press', 'strength', ARRAY['chest', 'shoulders', 'triceps'], ARRAY['barbell', 'bench'], 'intermediate', 'Lie on bench, lower bar to chest, press up', true),
('Squat', 'strength', ARRAY['quadriceps', 'glutes', 'hamstrings'], ARRAY['barbell', 'squat_rack'], 'intermediate', 'Stand with feet shoulder-width apart, lower until thighs parallel to floor', true),
('Deadlift', 'strength', ARRAY['hamstrings', 'glutes', 'back', 'traps'], ARRAY['barbell'], 'advanced', 'Lift bar from floor to standing position, keeping back straight', true),
('Pull-ups', 'strength', ARRAY['lats', 'biceps', 'rhomboids'], ARRAY['pull_up_bar'], 'intermediate', 'Hang from bar, pull body up until chin over bar', true),
('Military Press', 'strength', ARRAY['shoulders', 'triceps'], ARRAY['barbell'], 'intermediate', 'Press bar overhead from shoulder level', true),
('Bicep Curls', 'strength', ARRAY['biceps'], ARRAY['dumbbells'], 'beginner', 'Curl weights up, keeping elbows stationary', false),
('Sit-ups', 'strength', ARRAY['abs'], ARRAY['none'], 'beginner', 'Lie on back, lift torso to sitting position', false),
('Push-ups', 'strength', ARRAY['chest', 'shoulders', 'triceps'], ARRAY['none'], 'beginner', 'Lower body to ground, push back up', true),
('Lunges', 'strength', ARRAY['quadriceps', 'glutes'], ARRAY['none'], 'beginner', 'Step forward, lower back knee to ground', false),
('Plank', 'strength', ARRAY['core', 'shoulders'], ARRAY['none'], 'beginner', 'Hold body in straight line, supported by forearms', false),
('Running', 'cardio', ARRAY['legs', 'glutes', 'calves'], ARRAY['none'], 'beginner', 'Maintain steady pace for specified distance', false),
('Cycling', 'cardio', ARRAY['quadriceps', 'calves'], ARRAY['bike'], 'beginner', 'Pedal at consistent cadence', false),
('Swimming', 'cardio', ARRAY['full_body'], ARRAY['pool'], 'intermediate', 'Swim laps using preferred stroke', false),
('Jump Rope', 'cardio', ARRAY['calves', 'shoulders'], ARRAY['jump_rope'], 'beginner', 'Jump over rope continuously', false),
('Burpees', 'cardio', ARRAY['full_body'], ARRAY['none'], 'intermediate', 'Squat, jump back to plank, jump forward, jump up', true),
('Stretching', 'flexibility', ARRAY['various'], ARRAY['none'], 'beginner', 'Hold stretch for 30-60 seconds', false),
('Yoga', 'flexibility', ARRAY['full_body'], ARRAY['yoga_mat'], 'beginner', 'Perform yoga poses and flows', false),
('Foam Rolling', 'flexibility', ARRAY['various'], ARRAY['foam_roller'], 'beginner', 'Roll muscles to release tension', false)
) AS new_exercises(name, category, muscle_groups, equipment_needed, difficulty_level, instructions, is_compound)
WHERE NOT EXISTS (
    SELECT 1 FROM exercises WHERE exercises.name = new_exercises.name
);
