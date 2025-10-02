# Fitness Tracker Database Migration

## Problem

The fitness tracker module requires database tables to be created before it can function properly. The tables are defined in the migration file but need to be applied to your Supabase database.

## Solution

Apply the fitness system migration to your Supabase database.

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `apply-fitness-migration.sql`
4. Paste the SQL into the editor
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI (if available)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

## What This Migration Creates

The migration creates the following tables:

1. **`fitness_stats`** - For logging cardio, strength, flexibility, and endurance statistics
2. **`fitness_goals`** - For setting and tracking fitness objectives
3. **`body_photos`** - For uploading and analyzing body photos
4. **`workout_plans`** - For AI-generated workout plans
5. **`nutrition_plans`** - For AI-generated nutrition plans
6. **`exercises`** - Database of exercises with instructions

## Features Enabled After Migration

- ✅ Log fitness statistics (cardio times, strength lifts, etc.)
- ✅ Set fitness goals (weight loss, muscle gain, etc.)
- ✅ Upload body photos for analysis
- ✅ Generate AI-powered workout plans
- ✅ Create AI-generated nutrition plans
- ✅ Track progress over time

## Security Features

- Row Level Security (RLS) enabled on all tables
- User-specific data isolation
- Proper authentication checks
- Secure API endpoints

## Verification

After applying the migration, you can verify it worked by:

1. Going to the Fitness Tracker module
2. Clicking "Log Current Stats"
3. If the form appears without errors, the migration was successful

## Troubleshooting

If you encounter issues:

1. Check the Supabase logs for any SQL errors
2. Ensure your user has proper permissions
3. Verify the migration completed successfully by checking the tables in the Supabase dashboard
