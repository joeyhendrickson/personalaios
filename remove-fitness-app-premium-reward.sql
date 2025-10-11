-- Remove "Fitness App Premium" reward from the database
DELETE FROM rewards 
WHERE title = 'Fitness App Premium' 
  AND description = 'Get premium access to a fitness tracking app';

-- Verify deletion
SELECT 'Removed Fitness App Premium reward' as status;
