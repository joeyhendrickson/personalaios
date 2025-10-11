-- Check what columns exist in user_analytics_summary
SELECT 
    'user_analytics_summary columns' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_analytics_summary' 
AND table_schema = 'public'
ORDER BY ordinal_position;
