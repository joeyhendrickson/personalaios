-- Basic counts across all tables
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
