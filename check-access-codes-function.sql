-- Check if the create_access_code function exists
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_access_code' 
AND routine_schema = 'public';
