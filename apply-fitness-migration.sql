-- Apply Fitness System Migration
-- Run this script in your Supabase SQL Editor to create all fitness tracking tables

-- Body analysis and photos table
CREATE TABLE IF NOT EXISTS body_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type TEXT DEFAULT 'front' CHECK (photo_type IN ('front', 'side', 'back')),
    height_inches DECIMAL(5,2), -- Height in inches
    weight_lbs DECIMAL(6,2), -- Weight in pounds
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analysis_data JSONB, -- AI analysis results
    target_areas TEXT[], -- Array of target areas selected by user
    body_type_goal TEXT, -- Desired body type transformation
    is_primary BOOLEAN DEFAULT FALSE, -- Primary photo for analysis
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fitness goals and body type preferences
CREATE TABLE IF NOT EXISTS fitness_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('weight_loss', 'muscle_gain', 'endurance', 'strength', 'flexibility', 'body_recomposition', 'general_fitness')),
    target_body_type TEXT, -- Desired body type
    target_weight DECIMAL(5,2), -- Target weight in lbs/kg
    current_weight DECIMAL(5,2), -- Current weight
    target_body_fat_percentage DECIMAL(4,2), -- Target body fat %
    current_body_fat_percentage DECIMAL(4,2), -- Current body fat %
    target_areas TEXT[], -- Areas to focus on
    timeline_weeks INTEGER DEFAULT 12, -- Goal timeline in weeks
    priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high')),
    description TEXT, -- Detailed description of the fitness goal
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Current fitness statistics
CREATE TABLE IF NOT EXISTS fitness_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stat_type TEXT NOT NULL CHECK (stat_type IN ('cardio', 'strength', 'flexibility', 'endurance')),
    exercise_name TEXT NOT NULL,
    measurement_value DECIMAL(8,2), -- Time, weight, reps, etc.
    measurement_unit TEXT NOT NULL, -- seconds, minutes, lbs, kg, reps, etc.
    rep_range TEXT, -- e.g., "1-5", "6-12", "15-20"
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
    target_areas TEXT[], -- Areas this plan focuses on
    goals_supported TEXT[], -- Goals this plan supports
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
    muscle_groups TEXT[], -- Array of muscle groups targeted
    equipment_needed TEXT[], -- Equipment required
    difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    instructions TEXT,
    video_url TEXT,
    image_url TEXT,
    is_compound BOOLEAN DEFAULT FALSE, -- Compound vs isolation exercise
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
    diet_modifications TEXT[], -- Array of modifications to the base diet
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_body_photos_user_id ON body_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_goals_user_id ON fitness_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_stats_user_id ON fitness_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_stats_recorded_at ON fitness_stats(recorded_at);
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON nutrition_plans(user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_body_photos_updated_at BEFORE UPDATE ON body_photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fitness_goals_updated_at BEFORE UPDATE ON fitness_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fitness_stats_updated_at BEFORE UPDATE ON fitness_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workout_plans_updated_at BEFORE UPDATE ON workout_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nutrition_plans_updated_at BEFORE UPDATE ON nutrition_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE body_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own body photos" ON body_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own body photos" ON body_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own body photos" ON body_photos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own body photos" ON body_photos FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own fitness goals" ON fitness_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitness goals" ON fitness_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitness goals" ON fitness_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitness goals" ON fitness_goals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own fitness stats" ON fitness_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitness stats" ON fitness_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitness stats" ON fitness_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitness stats" ON fitness_stats FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own workout plans" ON workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own workout plans" ON workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workout plans" ON workout_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workout plans" ON workout_plans FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view exercises" ON exercises FOR SELECT USING (true);

CREATE POLICY "Users can view their own nutrition plans" ON nutrition_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own nutrition plans" ON nutrition_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own nutrition plans" ON nutrition_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own nutrition plans" ON nutrition_plans FOR DELETE USING (auth.uid() = user_id);

-- Insert default exercises (only if they don't already exist)
INSERT INTO exercises (name, category, muscle_groups, equipment_needed, difficulty_level, instructions, is_compound)
SELECT * FROM (VALUES
-- Strength Exercises
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

-- Cardio Exercises
('Running', 'cardio', ARRAY['legs', 'glutes', 'calves'], ARRAY['none'], 'beginner', 'Maintain steady pace for specified distance', false),
('Cycling', 'cardio', ARRAY['quadriceps', 'calves'], ARRAY['bike'], 'beginner', 'Pedal at consistent cadence', false),
('Swimming', 'cardio', ARRAY['full_body'], ARRAY['pool'], 'intermediate', 'Swim laps using preferred stroke', false),
('Jump Rope', 'cardio', ARRAY['calves', 'shoulders'], ARRAY['jump_rope'], 'beginner', 'Jump over rope continuously', false),
('Burpees', 'cardio', ARRAY['full_body'], ARRAY['none'], 'intermediate', 'Squat, jump back to plank, jump forward, jump up', true),

-- Flexibility Exercises
('Stretching', 'flexibility', ARRAY['various'], ARRAY['none'], 'beginner', 'Hold stretch for 30-60 seconds', false),
('Yoga', 'flexibility', ARRAY['full_body'], ARRAY['yoga_mat'], 'beginner', 'Perform yoga poses and flows', false),
('Foam Rolling', 'flexibility', ARRAY['various'], ARRAY['foam_roller'], 'beginner', 'Roll muscles to release tension', false)
) AS new_exercises(name, category, muscle_groups, equipment_needed, difficulty_level, instructions, is_compound)
WHERE NOT EXISTS (
    SELECT 1 FROM exercises WHERE exercises.name = new_exercises.name
);
