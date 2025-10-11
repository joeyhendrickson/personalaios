-- Check if the trigger exists and what it's doing
SELECT 
    trigger_name,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_user_analytics';

-- Check if the analytics tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_analytics_summary', 'user_activity_logs');

