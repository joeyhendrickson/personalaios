-- FITNESS WORKOUT PLAN FIX - Add missing workout_plan_exercises table
-- Run this in your Supabase SQL Editor to fix the workout plan generation

-- Create the missing workout_plan_exercises table
CREATE TABLE IF NOT EXISTS workout_plan_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    week_number INTEGER NOT NULL CHECK (week_number >= 1),
    sets INTEGER NOT NULL CHECK (sets > 0),
    reps TEXT NOT NULL,
    weight_suggestion DECIMAL(8,2),
    rest_seconds INTEGER DEFAULT 60,
    order_index INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workout_plan_exercises ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workout_plan_exercises
DROP POLICY IF EXISTS "Users can view their own workout plan exercises" ON workout_plan_exercises;
DROP POLICY IF EXISTS "Users can insert their own workout plan exercises" ON workout_plan_exercises;
DROP POLICY IF EXISTS "Users can update their own workout plan exercises" ON workout_plan_exercises;
DROP POLICY IF EXISTS "Users can delete their own workout plan exercises" ON workout_plan_exercises;

CREATE POLICY "Users can view their own workout plan exercises" ON workout_plan_exercises
  FOR SELECT USING (
    workout_plan_id IN (
      SELECT id FROM workout_plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own workout plan exercises" ON workout_plan_exercises
  FOR INSERT WITH CHECK (
    workout_plan_id IN (
      SELECT id FROM workout_plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own workout plan exercises" ON workout_plan_exercises
  FOR UPDATE USING (
    workout_plan_id IN (
      SELECT id FROM workout_plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own workout plan exercises" ON workout_plan_exercises
  FOR DELETE USING (
    workout_plan_id IN (
      SELECT id FROM workout_plans WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_plan_exercises_workout_plan_id ON workout_plan_exercises(workout_plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_plan_exercises_exercise_id ON workout_plan_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_plan_exercises_day_week ON workout_plan_exercises(day_of_week, week_number);

-- Add missing columns to workout_plans table if they don't exist
DO $$ 
BEGIN
    -- Add goals_supported column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workout_plans' AND column_name = 'goals_supported') THEN
        ALTER TABLE workout_plans ADD COLUMN goals_supported TEXT[];
    END IF;
END $$;

-- Success message
SELECT 'WORKOUT PLAN FIX COMPLETED! The workout_plan_exercises table has been created and workout plan generation should now work.' as result;
