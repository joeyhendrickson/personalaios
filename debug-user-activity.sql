-- DIAGNOSTIC SCRIPT: Check why joeyhendrickson@me.com has no activity logs

-- Step 1: Check if user exists in auth.users
SELECT 
  id as user_id,
  email,
  created_at,
  last_sign_in_at,
  confirmed_at
FROM auth.users
WHERE email = 'joeyhendrickson@me.com';

-- Step 2: Check if user has a profile
SELECT 
  id as user_id,
  email,
  name,
  created_at
FROM public.profiles
WHERE email = 'joeyhendrickson@me.com';

-- Step 3: Check if user has any activity logs
SELECT 
  id,
  user_id,
  activity_type,
  activity_data,
  page_url,
  created_at
FROM public.user_activity_logs
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'joeyhendrickson@me.com'
)
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Check if user has analytics summary
SELECT 
  user_id,
  total_visits,
  total_time_spent,
  last_activity,
  created_at,
  updated_at
FROM public.user_analytics_summary
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'joeyhendrickson@me.com'
);

-- Step 5: Check if user has created any tasks/goals (to verify they're active)
SELECT 
  'tasks' as type,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM public.tasks
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'joeyhendrickson@me.com')
UNION ALL
SELECT 
  'goals' as type,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM public.goals
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'joeyhendrickson@me.com')
UNION ALL
SELECT 
  'points' as type,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM public.points_ledger
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'joeyhendrickson@me.com');

-- Step 6: Check RLS policies on user_activity_logs
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_activity_logs';

-- Step 7: Show ALL users that DO have activity logs (for comparison)
SELECT 
  u.email,
  u.id as user_id,
  COUNT(ual.id) as activity_count,
  MAX(ual.created_at) as last_activity
FROM auth.users u
LEFT JOIN public.user_activity_logs ual ON ual.user_id = u.id
GROUP BY u.email, u.id
HAVING COUNT(ual.id) > 0
ORDER BY activity_count DESC;

