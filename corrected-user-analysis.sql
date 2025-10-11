-- CORRECTED USER ACTIVITY ANALYSIS
-- This version checks actual table structures first

-- 1. Check what columns exist in user_analytics_summary
SELECT 
    'user_analytics_summary columns' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_analytics_summary' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Basic counts across all tables
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

-- 3. User classification breakdown
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

-- 4. Activity data summary
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

-- 5. Sample data from each table
SELECT 'SAMPLE: auth.users' as source, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5
UNION ALL
SELECT 'SAMPLE: profiles' as source, email, created_at::text FROM public.profiles ORDER BY created_at DESC LIMIT 5
UNION ALL  
SELECT 'SAMPLE: admin_users' as source, email, created_at::text FROM public.admin_users ORDER BY created_at DESC LIMIT 5
UNION ALL
SELECT 'SAMPLE: trial_subscriptions' as source, email, created_at::text FROM public.trial_subscriptions ORDER BY created_at DESC LIMIT 5
UNION ALL
SELECT 'SAMPLE: subscriptions' as source, user_id::text as email, created_at::text FROM public.subscriptions ORDER BY created_at DESC LIMIT 5
UNION ALL
SELECT 'SAMPLE: user_activity_logs' as source, user_id::text as email, created_at::text FROM public.user_activity_logs ORDER BY created_at DESC LIMIT 5
UNION ALL
SELECT 'SAMPLE: user_analytics_summary' as source, user_id::text as email, created_at::text FROM public.user_analytics_summary ORDER BY created_at DESC LIMIT 5;
