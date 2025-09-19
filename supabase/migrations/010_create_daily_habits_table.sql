-- Migration: Create daily habits table for recurring daily habits
-- This creates the daily_habits table for tracking recurring habits with points

-- Create daily_habits table
CREATE TABLE daily_habits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- Will be linked to auth.users
    title VARCHAR(255) NOT NULL,
    description TEXT,
    points_per_completion INTEGER NOT NULL DEFAULT 25,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create habit_completions table to track when habits are completed
CREATE TABLE habit_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    habit_id UUID NOT NULL REFERENCES daily_habits(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points_awarded INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_daily_habits_user_id ON daily_habits(user_id);
CREATE INDEX idx_daily_habits_active ON daily_habits(is_active);
CREATE INDEX idx_habit_completions_user_id ON habit_completions(user_id);
CREATE INDEX idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX idx_habit_completions_completed_at ON habit_completions(completed_at);

-- Add RLS policies for daily_habits table
ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own habits
CREATE POLICY "Users can view their own habits" ON daily_habits
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own habits
CREATE POLICY "Users can insert their own habits" ON daily_habits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own habits
CREATE POLICY "Users can update their own habits" ON daily_habits
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own habits
CREATE POLICY "Users can delete their own habits" ON daily_habits
    FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for habit_completions table
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own habit completions
CREATE POLICY "Users can view their own habit completions" ON habit_completions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own habit completions
CREATE POLICY "Users can insert their own habit completions" ON habit_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own habit completions
CREATE POLICY "Users can update their own habit completions" ON habit_completions
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own habit completions
CREATE POLICY "Users can delete their own habit completions" ON habit_completions
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_habits_updated_at BEFORE UPDATE ON daily_habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to add points to ledger when habit is completed
CREATE OR REPLACE FUNCTION add_habit_completion_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Add points to the points_ledger
    INSERT INTO points_ledger (user_id, points, description, created_at)
    VALUES (
        NEW.user_id, 
        NEW.points_awarded, 
        'Habit completed: ' || (SELECT title FROM daily_habits WHERE id = NEW.habit_id),
        NEW.completed_at
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for habit completion points
CREATE TRIGGER habit_completion_points_trigger 
    AFTER INSERT ON habit_completions 
    FOR EACH ROW 
    EXECUTE FUNCTION add_habit_completion_points();
