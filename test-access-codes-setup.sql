-- Test if access codes system is properly set up

-- 1. Check if table exists
SELECT 
    'Table Check' as test,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_codes') 
        THEN '✅ access_codes table exists'
        ELSE '❌ access_codes table missing'
    END as result;

-- 2. Check if function exists
SELECT 
    'Function Check' as test,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_access_code') 
        THEN '✅ create_access_code function exists'
        ELSE '❌ create_access_code function missing'
    END as result;

-- 3. Check table structure
SELECT 
    'Table Structure' as test,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'access_codes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Test the function manually
SELECT 'Manual Function Test' as test;
SELECT * FROM create_access_code('Test Code', 'test@example.com', 30);

-- 5. Check existing codes
SELECT 
    'Existing Codes' as test,
    COUNT(*) as total_codes,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_codes
FROM access_codes;
