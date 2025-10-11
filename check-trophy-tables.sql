-- Check if trophy tables exist and have data

-- Check if total_habit_trophies table exists and has data
SELECT 'total_habit_trophies' as table_name, COUNT(*) as count FROM total_habit_trophies;

-- Check if user_total_habit_trophies table exists and has data  
SELECT 'user_total_habit_trophies' as table_name, COUNT(*) as count FROM user_total_habit_trophies;

-- Check habit completions count
SELECT 'habit_completions' as table_name, COUNT(*) as count FROM habit_completions;
