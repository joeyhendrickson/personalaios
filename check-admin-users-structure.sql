-- Check the structure of admin_users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'admin_users'
ORDER BY ordinal_position;

