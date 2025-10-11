-- CREATE ADMIN ACCOUNT for josephgregoryhendrickson@gmail.com

-- Step 1: Insert admin user (if not exists)
INSERT INTO public.admin_users (email, role, is_active, created_at, updated_at)
VALUES (
  'josephgregoryhendrickson@gmail.com',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
  is_active = true,
  role = 'admin',
  updated_at = NOW();

-- Step 2: Verify the admin account was created
SELECT 
  'Admin Account Created' as status,
  id,
  email,
  role,
  is_active,
  created_at
FROM public.admin_users 
WHERE email = 'josephgregoryhendrickson@gmail.com';

-- Step 3: Show all admin users to confirm
SELECT 
  'All Admin Users' as source,
  email,
  role,
  is_active,
  created_at
FROM public.admin_users
ORDER BY created_at DESC;
