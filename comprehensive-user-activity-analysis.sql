-- COMPREHENSIVE USER ACTIVITY ANALYSIS
-- This script analyzes all user data across all tables to understand the current state

-- ========================================
-- 1. USER AUTHENTICATION OVERVIEW
-- ========================================
SELECT 
    'AUTH_USERS' as source_table,
    COUNT(*) as total_users,
    COUNT(CASE WHEN last_sign_in_at IS NOT NULL THEN 1 END) as users_with_logins,
    MIN(created_at) as earliest_user,
    MAX(created_at) as latest_user
FROM auth.users

UNION ALL

-- ========================================
-- 2. PROFILES TABLE ANALYSIS
-- ========================================
SELECT 
    'PROFILES' as source_table,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN name IS NOT NULL THEN 1 END) as profiles_with_names,
    MIN(created_at) as earliest_profile,
    MAX(created_at) as latest_profile
FROM public.profiles

UNION ALL

-- ========================================
-- 3. ADMIN USERS ANALYSIS
-- ========================================
SELECT 
    'ADMIN_USERS' as source_table,
    COUNT(*) as total_admins,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_admins,
    MIN(created_at) as earliest_admin,
    MAX(created_at) as latest_admin
FROM public.admin_users

UNION ALL

-- ========================================
-- 4. TRIAL SUBSCRIPTIONS ANALYSIS
-- ========================================
SELECT 
    'TRIAL_SUBSCRIPTIONS' as source_table,
    COUNT(*) as total_trials,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_trials,
    MIN(created_at) as earliest_trial,
    MAX(created_at) as latest_trial
FROM public.trial_subscriptions

UNION ALL

-- ========================================
-- 5. STANDARD SUBSCRIPTIONS ANALYSIS
-- ========================================
SELECT 
    'SUBSCRIPTIONS' as source_table,
    COUNT(*) as total_subscriptions,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
    MIN(created_at) as earliest_subscription,
    MAX(created_at) as latest_subscription
FROM public.subscriptions

UNION ALL

-- ========================================
-- 6. USER ACTIVITY LOGS ANALYSIS
-- ========================================
SELECT 
    'USER_ACTIVITY_LOGS' as source_table,
    COUNT(*) as total_activity_records,
    COUNT(DISTINCT user_id) as unique_users_with_activity,
    MIN(created_at) as earliest_activity,
    MAX(created_at) as latest_activity
FROM public.user_activity_logs

UNION ALL

-- ========================================
-- 7. USER ANALYTICS SUMMARY ANALYSIS
-- ========================================
SELECT 
    'USER_ANALYTICS_SUMMARY' as source_table,
    COUNT(*) as total_analytics_records,
    COUNT(CASE WHEN total_points > 0 THEN 1 END) as users_with_points,
    MIN(created_at) as earliest_analytics,
    MAX(created_at) as latest_analytics
FROM public.user_analytics_summary;

-- ========================================
-- 8. DETAILED USER BREAKDOWN BY TYPE
-- ========================================
WITH user_classification AS (
    SELECT 
        au.id as auth_user_id,
        au.email as auth_email,
        au.created_at as auth_created_at,
        au.last_sign_in_at,
        p.name as profile_name,
        p.created_at as profile_created_at,
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
    COUNT(CASE WHEN last_sign_in_at IS NOT NULL THEN 1 END) as users_with_logins,
    COUNT(CASE WHEN profile_name IS NOT NULL THEN 1 END) as users_with_profiles,
    MIN(auth_created_at) as earliest_user,
    MAX(auth_created_at) as latest_user
FROM user_classification
GROUP BY user_type
ORDER BY user_count DESC;

-- ========================================
-- 9. ACTIVITY DATA BY USER TYPE
-- ========================================
WITH user_classification AS (
    SELECT 
        au.id as auth_user_id,
        au.email as auth_email,
        CASE 
            WHEN au.email IN (SELECT email FROM public.admin_users WHERE is_active = true) THEN 'ADMIN'
            WHEN au.email IN (SELECT email FROM public.trial_subscriptions) THEN 'TRIAL'
            WHEN au.id IN (SELECT user_id FROM public.subscriptions WHERE plan_type = 'standard') THEN 'STANDARD'
            ELSE 'PREMIUM'
        END as user_type
    FROM auth.users au
),
activity_by_type AS (
    SELECT 
        uc.user_type,
        COUNT(ual.id) as total_activity_records,
        COUNT(DISTINCT ual.user_id) as unique_users_with_activity,
        MIN(ual.created_at) as earliest_activity,
        MAX(ual.created_at) as latest_activity
    FROM user_classification uc
    LEFT JOIN public.user_activity_logs ual ON ual.user_id = uc.auth_user_id
    GROUP BY uc.user_type
)
SELECT 
    user_type,
    total_activity_records,
    unique_users_with_activity,
    earliest_activity,
    latest_activity
FROM activity_by_type
ORDER BY total_activity_records DESC;

-- ========================================
-- 10. POINTS AND ANALYTICS BY USER TYPE
-- ========================================
WITH user_classification AS (
    SELECT 
        au.id as auth_user_id,
        au.email as auth_email,
        CASE 
            WHEN au.email IN (SELECT email FROM public.admin_users WHERE is_active = true) THEN 'ADMIN'
            WHEN au.email IN (SELECT email FROM public.trial_subscriptions) THEN 'TRIAL'
            WHEN au.id IN (SELECT user_id FROM public.subscriptions WHERE plan_type = 'standard') THEN 'STANDARD'
            ELSE 'PREMIUM'
        END as user_type
    FROM auth.users au
),
analytics_by_type AS (
    SELECT 
        uc.user_type,
        COUNT(uas.id) as total_analytics_records,
        COALESCE(SUM(uas.total_points), 0) as total_points_across_type,
        COALESCE(AVG(uas.total_points), 0) as avg_points_per_user,
        MIN(uas.created_at) as earliest_analytics,
        MAX(uas.created_at) as latest_analytics
    FROM user_classification uc
    LEFT JOIN public.user_analytics_summary uas ON uas.user_id = uc.auth_user_id
    GROUP BY uc.user_type
)
SELECT 
    user_type,
    total_analytics_records,
    total_points_across_type,
    ROUND(avg_points_per_user, 2) as avg_points_per_user,
    earliest_analytics,
    latest_analytics
FROM analytics_by_type
ORDER BY total_points_across_type DESC;

-- ========================================
-- 11. INDIVIDUAL USER DETAILS
-- ========================================
SELECT 
    'INDIVIDUAL_USERS' as analysis_type,
    au.email,
    p.name,
    CASE 
        WHEN au.email IN (SELECT email FROM public.admin_users WHERE is_active = true) THEN 'ADMIN'
        WHEN au.email IN (SELECT email FROM public.trial_subscriptions) THEN 'TRIAL'
        WHEN au.id IN (SELECT user_id FROM public.subscriptions WHERE plan_type = 'standard') THEN 'STANDARD'
        ELSE 'PREMIUM'
    END as user_type,
    au.created_at as auth_created,
    au.last_sign_in_at,
    p.created_at as profile_created,
    (SELECT COUNT(*) FROM public.user_activity_logs ual WHERE ual.user_id = au.id) as activity_count,
    (SELECT total_points FROM public.user_analytics_summary uas WHERE uas.user_id = au.id LIMIT 1) as total_points,
    (SELECT status FROM public.trial_subscriptions ts WHERE ts.email = au.email LIMIT 1) as trial_status,
    (SELECT status FROM public.subscriptions s WHERE s.user_id = au.id LIMIT 1) as subscription_status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.created_at DESC;
