-- ========================================================================
-- CLEANUP ADMIN TRIAL SUBSCRIPTIONS
-- ========================================================================
-- This script removes any trial subscriptions that were incorrectly created
-- for admin users. Admin accounts should NEVER have trial subscriptions.

-- Delete trial subscriptions for admin users
DELETE FROM trial_subscriptions 
WHERE email IN (
  SELECT email FROM admin_users WHERE is_active = true
);

-- Show which admin users had trial subscriptions (for logging)
SELECT 
  au.email,
  au.name,
  au.role,
  'Had trial subscription removed' as action
FROM admin_users au
WHERE au.is_active = true
  AND au.email IN (
    SELECT email FROM trial_subscriptions
  );

-- Verify cleanup
SELECT 
  'Remaining trial subscriptions' as status,
  COUNT(*) as count
FROM trial_subscriptions ts
JOIN admin_users au ON ts.email = au.email
WHERE au.is_active = true;

-- Show all current admin users (should have no trial subscriptions)
SELECT 
  'Admin users (should have no trials)' as status,
  au.email,
  au.name,
  au.role,
  CASE 
    WHEN ts.email IS NULL THEN 'No trial subscription ✓'
    ELSE 'ERROR: Has trial subscription!'
  END as trial_status
FROM admin_users au
LEFT JOIN trial_subscriptions ts ON au.email = ts.email
WHERE au.is_active = true
ORDER BY au.email;
