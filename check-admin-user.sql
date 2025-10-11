-- CHECK ADMIN USER SETUP

-- Step 1: Check if admin user exists in admin_users table
SELECT 
  'Admin Users Table' as source,
  au.id,
  au.email,
  au.role,
  au.is_active,
  au.created_at
FROM public.admin_users au
ORDER BY au.created_at DESC;

-- Step 2: Check your specific email
SELECT 
  'Your Admin Account' as source,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE email = 'josephgregoryhendrickson@gmail.com' 
      AND is_active = true
    ) THEN 'EXISTS AND ACTIVE'
    WHEN EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE email = 'josephgregoryhendrickson@gmail.com'
    ) THEN 'EXISTS BUT INACTIVE'
    ELSE 'DOES NOT EXIST'
  END as status;

-- Step 3: Show all auth users for comparison
SELECT 
  'Auth Users' as source,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
ORDER BY au.created_at DESC;
