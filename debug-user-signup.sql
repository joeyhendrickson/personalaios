-- ============================================
-- USER SIGNUP DEBUG SCRIPT
-- ============================================
-- This script helps diagnose user signup issues
-- ============================================

-- Step 1: Check if the user_analytics_summary table exists
SELECT 
  'Table Check:' as status,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'user_analytics_summary';

-- Step 2: Check if the trigger exists
SELECT 
  'Trigger Check:' as status,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_user_analytics';

-- Step 3: Check if the function exists
SELECT 
  'Function Check:' as status,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'create_user_analytics_on_signup';

-- Step 4: Check table structure
SELECT 
  'Table Structure:' as status,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_analytics_summary'
ORDER BY ordinal_position;

-- Step 5: Check if there are any existing users
SELECT 
  'Existing Users:' as status,
  COUNT(*) as user_count
FROM auth.users;

-- Step 6: Check if there are any analytics records
SELECT 
  'Analytics Records:' as status,
  COUNT(*) as analytics_count
FROM user_analytics_summary;

-- Step 7: Check for any recent errors in the logs (if available)
-- This might not work in all Supabase setups
SELECT 
  'Recent Activity:' as status,
  COUNT(*) as activity_count
FROM user_activity_logs
WHERE created_at > NOW() - INTERVAL '1 hour';

-- ============================================
-- TROUBLESHOOTING STEPS:
-- ============================================
-- 1. If user_analytics_summary table doesn't exist, run the admin migration
-- 2. If trigger doesn't exist, the migration might have failed
-- 3. If function doesn't exist, there's a syntax error in the migration
-- 4. Try creating a user manually to see the exact error
-- ============================================
