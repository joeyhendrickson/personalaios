-- QUICK FITNESS TEST - Run this to check which tables exist
-- This will show you exactly which fitness tables are missing

SELECT 
  'body_photos' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'body_photos') 
       THEN 'EXISTS' 
       ELSE 'MISSING' 
  END as status
UNION ALL
SELECT 
  'fitness_goals' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fitness_goals') 
       THEN 'EXISTS' 
       ELSE 'MISSING' 
  END as status
UNION ALL
SELECT 
  'fitness_stats' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fitness_stats') 
       THEN 'EXISTS' 
       ELSE 'MISSING' 
  END as status
UNION ALL
SELECT 
  'workout_plans' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_plans') 
       THEN 'EXISTS' 
       ELSE 'MISSING' 
  END as status
UNION ALL
SELECT 
  'nutrition_plans' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nutrition_plans') 
       THEN 'EXISTS' 
       ELSE 'MISSING' 
  END as status
UNION ALL
SELECT 
  'exercises' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercises') 
       THEN 'EXISTS' 
       ELSE 'MISSING' 
  END as status
ORDER BY table_name;
