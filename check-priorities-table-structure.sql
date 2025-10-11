-- Check the current structure of the priorities table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'priorities' 
ORDER BY ordinal_position;
