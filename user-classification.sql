-- User classification breakdown
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
