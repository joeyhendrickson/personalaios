-- FITNESS TABLE FIX: Add missing columns to existing tables
-- Run this in your Supabase SQL Editor to fix column mismatches

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

-- 4. Verify all columns exist
SELECT 
    'fitness_goals' as table_name,
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'fitness_goals' 
AND table_schema = 'public'

UNION ALL

SELECT 
    'body_photos' as table_name,
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'body_photos' 
AND table_schema = 'public'

UNION ALL

SELECT 
    'nutrition_plans' as table_name,
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'nutrition_plans' 
AND table_schema = 'public'

ORDER BY table_name, column_name;

-- Success message
SELECT 'Fitness table columns have been updated successfully!' as result;
