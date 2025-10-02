-- FITNESS TABLES FIX - Run this in your Supabase SQL Editor
-- This will create all the missing fitness tables and fix the error

-- 1. Create body_photos table
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

-- 2. Create fitness_goals table
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

-- 3. Create fitness_stats table
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

-- 4. Create workout_plans table
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

-- 5. Create nutrition_plans table
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

-- 6. Create exercises table
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

-- 6a. Add missing columns to exercises table if they don't exist
DO $$ 
BEGIN
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'description') THEN
        ALTER TABLE exercises ADD COLUMN description TEXT;
    END IF;
    
    -- Add instructions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'instructions') THEN
        ALTER TABLE exercises ADD COLUMN instructions TEXT[];
    END IF;
    
    -- Add muscle_groups column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'muscle_groups') THEN
        ALTER TABLE exercises ADD COLUMN muscle_groups TEXT[];
    END IF;
    
    -- Add equipment_needed column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'equipment_needed') THEN
        ALTER TABLE exercises ADD COLUMN equipment_needed TEXT[];
    END IF;
    
    -- Add difficulty_level column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'difficulty_level') THEN
        ALTER TABLE exercises ADD COLUMN difficulty_level TEXT;
    END IF;
END $$;

-- 7. Enable RLS on all tables
ALTER TABLE body_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for body_photos (with IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_photos' AND policyname = 'Users can view their own body photos') THEN
        CREATE POLICY "Users can view their own body photos" ON body_photos FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_photos' AND policyname = 'Users can insert their own body photos') THEN
        CREATE POLICY "Users can insert their own body photos" ON body_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_photos' AND policyname = 'Users can update their own body photos') THEN
        CREATE POLICY "Users can update their own body photos" ON body_photos FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_photos' AND policyname = 'Users can delete their own body photos') THEN
        CREATE POLICY "Users can delete their own body photos" ON body_photos FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 9. Create RLS policies for fitness_goals (with IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fitness_goals' AND policyname = 'Users can view their own fitness goals') THEN
        CREATE POLICY "Users can view their own fitness goals" ON fitness_goals FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fitness_goals' AND policyname = 'Users can insert their own fitness goals') THEN
        CREATE POLICY "Users can insert their own fitness goals" ON fitness_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fitness_goals' AND policyname = 'Users can update their own fitness goals') THEN
        CREATE POLICY "Users can update their own fitness goals" ON fitness_goals FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fitness_goals' AND policyname = 'Users can delete their own fitness goals') THEN
        CREATE POLICY "Users can delete their own fitness goals" ON fitness_goals FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 10. Create RLS policies for fitness_stats (with IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fitness_stats' AND policyname = 'Users can view their own fitness stats') THEN
        CREATE POLICY "Users can view their own fitness stats" ON fitness_stats FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fitness_stats' AND policyname = 'Users can insert their own fitness stats') THEN
        CREATE POLICY "Users can insert their own fitness stats" ON fitness_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fitness_stats' AND policyname = 'Users can update their own fitness stats') THEN
        CREATE POLICY "Users can update their own fitness stats" ON fitness_stats FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fitness_stats' AND policyname = 'Users can delete their own fitness stats') THEN
        CREATE POLICY "Users can delete their own fitness stats" ON fitness_stats FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 11. Create RLS policies for workout_plans (with IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workout_plans' AND policyname = 'Users can view their own workout plans') THEN
        CREATE POLICY "Users can view their own workout plans" ON workout_plans FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workout_plans' AND policyname = 'Users can insert their own workout plans') THEN
        CREATE POLICY "Users can insert their own workout plans" ON workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workout_plans' AND policyname = 'Users can update their own workout plans') THEN
        CREATE POLICY "Users can update their own workout plans" ON workout_plans FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workout_plans' AND policyname = 'Users can delete their own workout plans') THEN
        CREATE POLICY "Users can delete their own workout plans" ON workout_plans FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 12. Create RLS policies for nutrition_plans (with IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nutrition_plans' AND policyname = 'Users can view their own nutrition plans') THEN
        CREATE POLICY "Users can view their own nutrition plans" ON nutrition_plans FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nutrition_plans' AND policyname = 'Users can insert their own nutrition plans') THEN
        CREATE POLICY "Users can insert their own nutrition plans" ON nutrition_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nutrition_plans' AND policyname = 'Users can update their own nutrition plans') THEN
        CREATE POLICY "Users can update their own nutrition plans" ON nutrition_plans FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nutrition_plans' AND policyname = 'Users can delete their own nutrition plans') THEN
        CREATE POLICY "Users can delete their own nutrition plans" ON nutrition_plans FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 13. Create RLS policies for exercises (with IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercises' AND policyname = 'Anyone can view exercises') THEN
        CREATE POLICY "Anyone can view exercises" ON exercises FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercises' AND policyname = 'Only authenticated users can insert exercises') THEN
        CREATE POLICY "Only authenticated users can insert exercises" ON exercises FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- 14. Insert default exercises
INSERT INTO exercises (name, category, muscle_groups, equipment_needed, difficulty_level, description, instructions)
SELECT * FROM (VALUES
  ('Push-ups', 'strength', ARRAY['chest', 'shoulders', 'triceps'], ARRAY['none'], 'beginner', 'Classic bodyweight exercise for upper body strength', ARRAY['Start in plank position', 'Lower body until chest nearly touches floor', 'Push back up to starting position']),
  ('Squats', 'strength', ARRAY['quadriceps', 'glutes', 'hamstrings'], ARRAY['none'], 'beginner', 'Fundamental lower body exercise', ARRAY['Stand with feet shoulder-width apart', 'Lower body as if sitting back into a chair', 'Return to standing position']),
  ('Plank', 'strength', ARRAY['core', 'shoulders'], ARRAY['none'], 'beginner', 'Isometric core strengthening exercise', ARRAY['Start in push-up position', 'Hold body in straight line', 'Engage core muscles']),
  ('Burpees', 'cardio', ARRAY['full_body'], ARRAY['none'], 'intermediate', 'High-intensity full-body exercise', ARRAY['Start standing', 'Drop to push-up position', 'Do a push-up', 'Jump feet to hands', 'Jump up with arms overhead']),
  ('Mountain Climbers', 'cardio', ARRAY['core', 'shoulders', 'legs'], ARRAY['none'], 'intermediate', 'Dynamic core and cardio exercise', ARRAY['Start in plank position', 'Alternate bringing knees to chest', 'Maintain plank position throughout'])
) AS new_exercises(name, category, muscle_groups, equipment_needed, difficulty_level, description, instructions)
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE exercises.name = new_exercises.name);

-- 15. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_body_photos_user_id ON body_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_goals_user_id ON fitness_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_stats_user_id ON fitness_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON nutrition_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);

-- Success message
SELECT 'Fitness system migration completed successfully! All tables, policies, and indexes have been created.' as result;
