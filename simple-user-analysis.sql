-- SIMPLE USER ACTIVITY ANALYSIS
-- Run this in Supabase SQL Editor

-- 1. Basic counts across all tables
SELECT 'auth.users' as table_name, COUNT(*) as record_count FROM auth.users
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM public.profiles  
UNION ALL
SELECT 'admin_users' as table_name, COUNT(*) as record_count FROM public.admin_users
UNION ALL
SELECT 'trial_subscriptions' as table_name, COUNT(*) as record_count FROM public.trial_subscriptions
UNION ALL
SELECT 'subscriptions' as table_name, COUNT(*) as record_count FROM public.subscriptions
UNION ALL
SELECT 'user_activity_logs' as table_name, COUNT(*) as record_count FROM public.user_activity_logs
UNION ALL
SELECT 'user_analytics_summary' as table_name, COUNT(*) as record_count FROM public.user_analytics_summary;

-- 2. User classification breakdown
WITH user_classification AS (
    SELECT 
        au.id as user_id,
        au.email,
        au.created_at,
        au.last_sign_in_at,
        p.name,
        CASE 
            WHEN au.email IN (SELECT email FROM public.admin_users WHERE is_active = true) THEN 'ADMIN'
            WHEN au.email IN (SELECT email FROM public.trial_subscriptions) THEN 'TRIAL'
            WHEN au.id IN (SELECT user_id FROM public.subscriptions WHERE plan_type = 'standard') THEN 'STANDARD'
            ELSE 'PREMIUM'
        END as user_type
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
)
SELECT 
    user_type,
    COUNT(*) as user_count,
    STRING_AGG(email, ', ') as emails
FROM user_classification
GROUP BY user_type
ORDER BY user_count DESC;

-- 3. Activity data summary
SELECT 
    'Activity Records' as metric,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users
FROM public.user_activity_logs

UNION ALL

SELECT 
    'Analytics Records' as metric,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users
FROM public.user_analytics_summary;
