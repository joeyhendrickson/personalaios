-- ============================================
-- DEBUG ADMIN STATUS
-- ============================================
-- This script helps debug why admin access isn't working
-- ============================================

-- Step 1: Check if the user exists in admin_users table
SELECT 
  'Admin User Check:' as status,
  email,
  name,
  role,
  is_active,
  created_at
FROM admin_users 
WHERE email = 'josephgregoryhendrickson@gmail.com';

-- Step 2: Check if the user exists in auth.users table
SELECT 
  'Auth User Check:' as status,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'josephgregoryhendrickson@gmail.com';

-- Step 3: Check if the get_admin_dashboard_data function exists
SELECT 
  'Function Check:' as status,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_admin_dashboard_data';

-- Step 4: Check if the get_all_users_with_analytics function exists
SELECT 
  'Function Check:' as status,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_all_users_with_analytics';

-- Step 5: Test the admin dashboard data function
SELECT 
  'Dashboard Data Test:' as status,
  *
FROM get_admin_dashboard_data();

-- Step 6: Test the users analytics function
SELECT 
  'Users Analytics Test:' as status,
  *
FROM get_all_users_with_analytics()
LIMIT 5;

-- ============================================
-- TROUBLESHOOTING:
-- ============================================
-- 1. If admin_users check returns no rows, run the admin privileges SQL
-- 2. If auth.users check returns no rows, the user doesn't exist
-- 3. If functions don't exist, the admin migration didn't run properly
-- 4. If functions exist but return errors, there's a syntax issue
-- ============================================
