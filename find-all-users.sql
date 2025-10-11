-- FIND ALL USERS: Check both auth.users and profiles tables

-- Step 1: ALL users in auth.users (Supabase authentication)
SELECT 
  'Auth Users' as source,
  au.id as user_id,
  au.email,
  au.created_at as auth_created,
  au.last_sign_in_at,
  au.confirmed_at
FROM auth.users au
ORDER BY au.created_at DESC;

-- Step 2: ALL users in profiles table
SELECT 
  'Profiles Table' as source,
  p.id as user_id,
  p.email,
  p.name,
  p.created_at as profile_created
FROM public.profiles p
ORDER BY p.created_at DESC;

-- Step 3: Find users in auth.users but NOT in profiles (missing profiles)
SELECT 
  'Missing Profiles' as source,
  au.id as user_id,
  au.email,
  au.created_at as auth_created,
  'NO PROFILE RECORD' as status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- Step 4: Find users in profiles but NOT in auth.users (orphaned profiles)
SELECT 
  'Orphaned Profiles' as source,
  p.id as user_id,
  p.email,
  p.name,
  p.created_at as profile_created,
  'NO AUTH RECORD' as status
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE au.id IS NULL
ORDER BY p.created_at DESC;
