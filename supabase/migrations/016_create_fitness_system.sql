-- Create fitness tracking system tables
-- This migration creates tables for comprehensive fitness tracking, body analysis, and workout planning

-- Body analysis and photos table
CREATE TABLE IF NOT EXISTS body_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type TEXT DEFAULT 'front' CHECK (photo_type IN ('front', 'side', 'back')),
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

-- Workout sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
    session_name TEXT NOT NULL,
    session_type TEXT NOT NULL,
    duration_minutes INTEGER,
    calories_burned INTEGER,
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 10),
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercise database
CREATE TABLE IF NOT EXISTS exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
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

-- Workout plan exercises (many-to-many relationship)
CREATE TABLE IF NOT EXISTS workout_plan_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1=Monday, 7=Sunday
    week_number INTEGER DEFAULT 1,
    sets INTEGER DEFAULT 3,
    reps TEXT, -- e.g., "8-12", "15-20", "30 seconds"
    weight_suggestion DECIMAL(6,2), -- Suggested weight
    rest_seconds INTEGER DEFAULT 60,
    order_index INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout session exercises (actual performance)
CREATE TABLE IF NOT EXISTS workout_session_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    sets_completed INTEGER DEFAULT 0,
    reps_completed TEXT, -- Actual reps performed
    weight_used DECIMAL(6,2), -- Actual weight used
    duration_seconds INTEGER, -- For time-based exercises
    distance_miles DECIMAL(6,2), -- For cardio exercises
    calories_burned INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nutrition and diet plans
CREATE TABLE IF NOT EXISTS nutrition_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('weight_loss', 'muscle_gain', 'maintenance', 'performance', 'medical')),
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

-- Daily nutrition tracking
CREATE TABLE IF NOT EXISTS daily_nutrition (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nutrition_plan_id UUID REFERENCES nutrition_plans(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    calories_consumed INTEGER DEFAULT 0,
    protein_grams INTEGER DEFAULT 0,
    carbs_grams INTEGER DEFAULT 0,
    fat_grams INTEGER DEFAULT 0,
    fiber_grams INTEGER DEFAULT 0,
    water_liters DECIMAL(4,2) DEFAULT 0,
    weight_lbs DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Progress tracking
CREATE TABLE IF NOT EXISTS fitness_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    progress_type TEXT NOT NULL CHECK (progress_type IN ('weight', 'body_fat', 'measurements', 'strength', 'cardio', 'flexibility')),
    measurement_value DECIMAL(8,2) NOT NULL,
    measurement_unit TEXT NOT NULL,
    body_part TEXT, -- For measurements (chest, waist, etc.)
    exercise_name TEXT, -- For strength/cardio progress
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recovery and wellness tracking
CREATE TABLE IF NOT EXISTS recovery_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sleep_hours DECIMAL(3,1),
    sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
    soreness_level INTEGER CHECK (soreness_level >= 1 AND soreness_level <= 10),
    recovery_activities TEXT[], -- Array of recovery activities
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- AI-generated insights and recommendations
CREATE TABLE IF NOT EXISTS fitness_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('progress_analysis', 'workout_recommendation', 'nutrition_advice', 'recovery_suggestion', 'goal_adjustment')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    data JSONB, -- Additional insight data
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_read BOOLEAN DEFAULT FALSE,
    is_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_body_photos_user_id ON body_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_body_photos_uploaded_at ON body_photos(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_fitness_goals_user_id ON fitness_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_goals_is_active ON fitness_goals(is_active);
CREATE INDEX IF NOT EXISTS idx_fitness_stats_user_id ON fitness_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_stats_recorded_at ON fitness_stats(recorded_at);
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_is_active ON workout_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed_at ON workout_sessions(completed_at);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON exercises USING GIN(muscle_groups);
CREATE INDEX IF NOT EXISTS idx_workout_plan_exercises_plan_id ON workout_plan_exercises(workout_plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_session_exercises_session_id ON workout_session_exercises(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON nutrition_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_nutrition_user_id ON daily_nutrition(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_nutrition_date ON daily_nutrition(date);
CREATE INDEX IF NOT EXISTS idx_fitness_progress_user_id ON fitness_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_progress_recorded_at ON fitness_progress(recorded_at);
CREATE INDEX IF NOT EXISTS idx_recovery_tracking_user_id ON recovery_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_tracking_date ON recovery_tracking(date);
CREATE INDEX IF NOT EXISTS idx_fitness_insights_user_id ON fitness_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_insights_type ON fitness_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_fitness_insights_is_read ON fitness_insights(is_read);

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
CREATE TRIGGER update_workout_sessions_updated_at BEFORE UPDATE ON workout_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workout_plan_exercises_updated_at BEFORE UPDATE ON workout_plan_exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workout_session_exercises_updated_at BEFORE UPDATE ON workout_session_exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nutrition_plans_updated_at BEFORE UPDATE ON nutrition_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_nutrition_updated_at BEFORE UPDATE ON daily_nutrition FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fitness_progress_updated_at BEFORE UPDATE ON fitness_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recovery_tracking_updated_at BEFORE UPDATE ON recovery_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fitness_insights_updated_at BEFORE UPDATE ON fitness_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE body_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_insights ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can view their own workout sessions" ON workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own workout sessions" ON workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workout sessions" ON workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workout sessions" ON workout_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view exercises" ON exercises FOR SELECT USING (true);
CREATE POLICY "Users can view their own workout plan exercises" ON workout_plan_exercises FOR SELECT USING (
    EXISTS (SELECT 1 FROM workout_plans WHERE id = workout_plan_exercises.workout_plan_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert their own workout plan exercises" ON workout_plan_exercises FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workout_plans WHERE id = workout_plan_exercises.workout_plan_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their own workout plan exercises" ON workout_plan_exercises FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workout_plans WHERE id = workout_plan_exercises.workout_plan_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their own workout plan exercises" ON workout_plan_exercises FOR DELETE USING (
    EXISTS (SELECT 1 FROM workout_plans WHERE id = workout_plan_exercises.workout_plan_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view their own workout session exercises" ON workout_session_exercises FOR SELECT USING (
    EXISTS (SELECT 1 FROM workout_sessions WHERE id = workout_session_exercises.workout_session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert their own workout session exercises" ON workout_session_exercises FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workout_sessions WHERE id = workout_session_exercises.workout_session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their own workout session exercises" ON workout_session_exercises FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workout_sessions WHERE id = workout_session_exercises.workout_session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their own workout session exercises" ON workout_session_exercises FOR DELETE USING (
    EXISTS (SELECT 1 FROM workout_sessions WHERE id = workout_session_exercises.workout_session_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view their own nutrition plans" ON nutrition_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own nutrition plans" ON nutrition_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own nutrition plans" ON nutrition_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own nutrition plans" ON nutrition_plans FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own daily nutrition" ON daily_nutrition FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily nutrition" ON daily_nutrition FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily nutrition" ON daily_nutrition FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own daily nutrition" ON daily_nutrition FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own fitness progress" ON fitness_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitness progress" ON fitness_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitness progress" ON fitness_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitness progress" ON fitness_progress FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own recovery tracking" ON recovery_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recovery tracking" ON recovery_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recovery tracking" ON recovery_tracking FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recovery tracking" ON recovery_tracking FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own fitness insights" ON fitness_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitness insights" ON fitness_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitness insights" ON fitness_insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitness insights" ON fitness_insights FOR DELETE USING (auth.uid() = user_id);

-- Insert default exercises
INSERT INTO exercises (name, category, muscle_groups, equipment_needed, difficulty_level, instructions, is_compound) VALUES
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
('Foam Rolling', 'flexibility', ARRAY['various'], ARRAY['foam_roller'], 'beginner', 'Roll muscles to release tension', false);

-- Insert default body types and target areas
-- These will be used in the UI for user selection
INSERT INTO fitness_insights (user_id, insight_type, title, description, data, priority) VALUES
('00000000-0000-0000-0000-000000000000', 'progress_analysis', 'Body Type Reference', 'Available body types for goal setting', 
 '{"body_types": ["ectomorph", "mesomorph", "endomorph", "athletic", "lean", "muscular", "toned"], "target_areas": ["chest", "shoulders", "arms", "back", "abs", "legs", "glutes", "calves", "full_body"]}', 'low');
