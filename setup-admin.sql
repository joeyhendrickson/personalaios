-- ============================================
-- ADMIN SETUP SCRIPT
-- ============================================
-- This script helps you set up your first admin account
-- 
-- IMPORTANT: You must first create a regular user account
-- through the app's signup process before running this script
-- ============================================

-- Step 1: Insert yourself as a super admin
-- Replace 'joeyhendrickson@gmail.com' with your actual email address
INSERT INTO admin_users (email, name, role) 
VALUES ('joeyhendrickson@gmail.com', 'Joey Hendrickson', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- Step 2: Verify the admin user was created
SELECT 
  'Admin User Created:' as status,
  email,
  name,
  role,
  is_active,
  created_at
FROM admin_users 
WHERE email = 'joeyhendrickson@gmail.com';

-- Step 3: Check if you have a corresponding auth.users record
SELECT 
  'Auth User Check:' as status,
  u.email,
  u.created_at as auth_created,
  u.last_sign_in_at,
  u.email_confirmed_at
FROM auth.users u
WHERE u.email = 'joeyhendrickson@gmail.com';

-- Step 4: Check if analytics are being tracked
SELECT 
  'Analytics Check:' as status,
  u.email,
  ua.total_visits,
  ua.total_time_spent,
  ua.total_tasks_created,
  ua.total_goals_created,
  ua.first_visit,
  ua.last_visit
FROM auth.users u
LEFT JOIN user_analytics_summary ua ON u.id = ua.user_id
WHERE u.email = 'joeyhendrickson@gmail.com';

-- Step 5: Show all current users (for reference)
SELECT 
  'All Users:' as status,
  u.email,
  u.created_at,
  ua.total_visits,
  ua.first_visit,
  ua.last_visit,
  CASE 
    WHEN au.email IS NOT NULL THEN 'ADMIN'
    ELSE 'USER'
  END as user_type
FROM auth.users u
LEFT JOIN user_analytics_summary ua ON u.id = ua.user_id
LEFT JOIN admin_users au ON u.email = au.email
ORDER BY u.created_at DESC
LIMIT 10;

-- ============================================
-- NEXT STEPS:
-- ============================================
-- 1. Make sure you have signed up as a regular user first
-- 2. Run this script to grant yourself admin privileges
-- 3. Go to http://localhost:3000/admin/login
-- 4. Sign in with your regular user credentials
-- 5. You should be redirected to the admin dashboard
-- ============================================
