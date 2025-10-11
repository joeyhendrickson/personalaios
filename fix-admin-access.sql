-- Fix Admin Access for Joey Hendrickson
-- Run this in your Supabase SQL editor

-- Step 1: Check if you exist in admin_users table
SELECT 'Current Admin Users:' as status, email, role, is_active 
FROM admin_users;

-- Step 2: Add yourself as admin if not already there
-- Replace with your actual email if different
INSERT INTO admin_users (email, name, role, is_active) 
VALUES ('joeyhendrickson@me.com', 'Joey Hendrickson', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- Step 3: Verify you're now an admin
SELECT 'Updated Admin Users:' as status, email, role, is_active, created_at, updated_at
FROM admin_users 
WHERE email = 'joeyhendrickson@me.com';

-- Step 4: Check if you have a corresponding auth.users record
-- This will show your user ID which should match the one in your data
SELECT 'Auth User Check:' as status, 
       u.id as user_id,
       u.email,
       u.created_at as auth_created,
       u.last_sign_in_at,
       u.email_confirmed_at
FROM auth.users u
WHERE u.email = 'joeyhendrickson@me.com';

-- Step 5: Verify your user ID matches the one with data
-- This should show your user ID: 94a93832-cd8e-47fe-aeae-dbd945557f79
SELECT 'User Data Check:' as status,
       'Your user ID should be: 94a93832-cd8e-47fe-aeae-dbd945557f79' as note;
