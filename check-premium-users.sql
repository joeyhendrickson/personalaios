-- QUICK CHECK: Why Premium module shows 0 users

-- Step 1: Show ALL users in auth.users
SELECT 
  'All Auth Users' as category,
  au.id as user_id,
  au.email,
  au.created_at
FROM auth.users au
ORDER BY au.created_at DESC;

-- Step 2: Show ALL profiles
SELECT 
  'All Profiles' as category,
  p.id as user_id,
  p.email,
  p.name,
  p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC;

-- Step 3: Show trial users
SELECT 
  'Trial Users' as category,
  ts.email,
  ts.name,
  ts.created_at
FROM public.trial_subscriptions ts
ORDER BY ts.created_at DESC;

-- Step 4: Show standard users
SELECT 
  'Standard Users' as category,
  s.user_id,
  s.plan_type,
  s.status,
  s.created_at
FROM public.subscriptions s
WHERE s.plan_type = 'standard'
ORDER BY s.created_at DESC;

-- Step 5: Show admin users
SELECT 
  'Admin Users' as category,
  au.email,
  au.role,
  au.created_at
FROM public.admin_users au
WHERE au.is_active = true
ORDER BY au.created_at DESC;

-- Step 6: Identify who should be Premium
SELECT 
  'Should Be Premium' as category,
  p.id as user_id,
  p.email,
  p.name,
  p.created_at,
  CASE 
    WHEN ts.email IS NOT NULL THEN 'Trial'
    WHEN s.user_id IS NOT NULL THEN 'Standard'
    WHEN au.email IS NOT NULL THEN 'Admin'
    ELSE 'Premium'
  END as actual_type
FROM public.profiles p
LEFT JOIN public.trial_subscriptions ts ON ts.email = p.email
LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.plan_type = 'standard'
LEFT JOIN public.admin_users au ON au.email = p.email AND au.is_active = true
ORDER BY p.created_at DESC;
