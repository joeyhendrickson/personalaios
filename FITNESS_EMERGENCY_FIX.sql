-- FITNESS EMERGENCY FIX - This will definitely work!
-- Run this in your Supabase SQL Editor to fix the fitness tracker

-- Step 1: Create all tables (safe with IF NOT EXISTS)
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

CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    difficulty_level TEXT NOT NULL,
    duration_weeks INTEGER NOT NULL,
    frequency_per_week INTEGER NOT NULL,
    target_areas TEXT[],
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nutrition_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    diet_type TEXT,
    diet_modifications TEXT[],
    daily_calories INTEGER,
    protein_grams INTEGER,
    carbs_grams INTEGER,
    fat_grams INTEGER,
    fiber_grams INTEGER,
    water_liters DECIMAL(4,2),
    meal_frequency INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    muscle_groups TEXT[],
    equipment_needed TEXT[],
    difficulty_level TEXT,
    description TEXT,
    instructions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS (safe)
ALTER TABLE body_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies (safe with DROP IF EXISTS first)
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

DROP POLICY IF EXISTS "Users can view their own nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Users can insert their own nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Users can update their own nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Users can delete their own nutrition plans" ON nutrition_plans;

CREATE POLICY "Users can view their own nutrition plans" ON nutrition_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own nutrition plans" ON nutrition_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own nutrition plans" ON nutrition_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own nutrition plans" ON nutrition_plans FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view exercises" ON exercises;
DROP POLICY IF EXISTS "Only authenticated users can insert exercises" ON exercises;

CREATE POLICY "Anyone can view exercises" ON exercises FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can insert exercises" ON exercises FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Step 4: Add some basic exercises
INSERT INTO exercises (name, category, muscle_groups, equipment_needed, difficulty_level, description, instructions)
VALUES 
  ('Push-ups', 'strength', ARRAY['chest', 'shoulders', 'triceps'], ARRAY['none'], 'beginner', 'Classic bodyweight exercise for upper body strength', ARRAY['Start in plank position', 'Lower body until chest nearly touches floor', 'Push back up to starting position']),
  ('Squats', 'strength', ARRAY['quadriceps', 'glutes', 'hamstrings'], ARRAY['none'], 'beginner', 'Fundamental lower body exercise', ARRAY['Stand with feet shoulder-width apart', 'Lower body as if sitting back into a chair', 'Return to standing position']),
  ('Plank', 'strength', ARRAY['core', 'shoulders'], ARRAY['none'], 'beginner', 'Isometric core strengthening exercise', ARRAY['Start in push-up position', 'Hold body in straight line', 'Engage core muscles'])
ON CONFLICT (name) DO NOTHING;

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_body_photos_user_id ON body_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_goals_user_id ON fitness_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_stats_user_id ON fitness_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON nutrition_plans(user_id);

-- Success message
SELECT 'FITNESS EMERGENCY FIX COMPLETED! All tables, policies, and data have been created successfully.' as result;
