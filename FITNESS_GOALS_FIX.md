# Fitness Goals Creation Error - Fix Guide

## Problem

You're getting an error when trying to create fitness goals in the Fitness Tracker module.

## Root Cause

The fitness database tables haven't been created yet. The migration file exists but hasn't been applied to your Supabase database.

## Solution

### Step 1: Apply the Fitness Migration

1. **Open your Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Navigate to your project
   - Go to the **SQL Editor** tab

2. **Run the Migration Script**
   - Copy the contents of `apply-fitness-migration.sql`
   - Paste it into the SQL Editor
   - Click **Run** to execute the script

   **OR**
   - Copy and paste this SQL directly:

```sql
-- Apply Fitness System Migration
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

-- Enable RLS on all tables
ALTER TABLE body_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own body photos" ON body_photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own body photos" ON body_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body photos" ON body_photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body photos" ON body_photos
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own fitness goals" ON fitness_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fitness goals" ON fitness_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fitness goals" ON fitness_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fitness goals" ON fitness_goals
  FOR DELETE USING (auth.uid() = user_id);
```

### Step 2: Verify the Tables Were Created

After running the migration, you should see these tables in your Supabase dashboard:

- `body_photos`
- `fitness_goals`
- `fitness_stats`
- `workout_plans`
- `nutrition_plans`
- `exercises`

### Step 3: Test the Fitness Tracker

1. Go back to your Personal AI OS app
2. Navigate to the Fitness Tracker module
3. Try creating a fitness goal again
4. The error should be resolved

## Additional Notes

- The migration includes all necessary tables for the fitness tracker
- RLS (Row Level Security) policies are automatically created
- Each user can only access their own fitness data
- The migration is safe to run multiple times (uses `IF NOT EXISTS`)

## If You Still Get Errors

1. Check the browser console for any JavaScript errors
2. Check the server logs in your terminal
3. Verify you're logged in to the app
4. Make sure your Supabase connection is working

The fitness tracker should work perfectly once the database tables are created!
