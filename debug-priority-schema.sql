-- Check if the columns exist and have the right data
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'priorities' 
AND column_name IN ('is_deleted', 'deleted_at');

-- Check current priorities and their is_deleted status
SELECT 
  id, 
  title, 
  is_deleted, 
  deleted_at,
  created_at,
  updated_at
FROM priorities 
ORDER BY created_at DESC 
LIMIT 10;
