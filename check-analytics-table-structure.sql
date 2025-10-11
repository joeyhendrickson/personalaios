-- Check the actual structure of user_analytics_summary table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_analytics_summary' 
AND table_schema = 'public'
ORDER BY ordinal_position;
