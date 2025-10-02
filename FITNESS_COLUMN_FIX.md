# Fitness Goals Column Fix

## Problem

The fitness goals creation is failing because the API is trying to insert into a `description` column that doesn't exist in the database table.

## Root Cause

The database table was created from an older migration that doesn't include the `description` column, but the API code expects it to exist.

## Quick Fix

### Step 1: Add Missing Column

1. **Open Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Navigate to your project
   - Go to **SQL Editor**

2. **Run the Column Fix**
   - Copy and paste this SQL:

```sql
-- Add missing description column to fitness_goals table
ALTER TABLE fitness_goals
ADD COLUMN IF NOT EXISTS description TEXT;
```

3. **Click Run** to execute the command

### Step 2: Verify the Fix

After running the SQL, you should see a success message. The fitness goals creation should now work.

## Alternative: Complete Table Fix

If you want to ensure all columns are properly set up, run the complete fix:

```sql
-- FITNESS TABLE FIX: Add missing columns to existing tables

-- 1. Add description column to fitness_goals
ALTER TABLE fitness_goals
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Add height and weight columns to body_photos (if missing)
ALTER TABLE body_photos
ADD COLUMN IF NOT EXISTS height_inches DECIMAL(5,2);

ALTER TABLE body_photos
ADD COLUMN IF NOT EXISTS weight_lbs DECIMAL(6,2);

-- 3. Add diet columns to nutrition_plans (if missing)
ALTER TABLE nutrition_plans
ADD COLUMN IF NOT EXISTS diet_type TEXT;

ALTER TABLE nutrition_plans
ADD COLUMN IF NOT EXISTS diet_modifications TEXT[];
```

## Test the Fix

1. Go back to your Personal AI OS app
2. Navigate to the Fitness Tracker module
3. Try creating a fitness goal again
4. It should now work without errors!

## What This Fixes

- ✅ **Fitness Goals Creation** - Can now save goal descriptions
- ✅ **Body Photos** - Can now save height and weight data
- ✅ **Nutrition Plans** - Can now save diet type and modifications
- ✅ **All Fitness Features** - Complete functionality restored

The fitness tracker should now work perfectly!
