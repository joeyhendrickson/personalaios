-- Simple fix for priorities duplicates using current table structure
-- This works with the basic priorities table without task_id/project_id columns

-- First, clean up existing duplicates by title and priority_type
-- Keep the oldest one and mark the rest as deleted

-- Clean up duplicate fire_auto priorities by title
WITH duplicate_fire_auto AS (
  SELECT 
    user_id, 
    title,
    priority_type,
    MIN(created_at) as keep_created_at
  FROM priorities 
  WHERE priority_type = 'fire_auto' 
    AND is_deleted = false
  GROUP BY user_id, title, priority_type
  HAVING COUNT(*) > 1
),
duplicates_to_delete AS (
  SELECT p.id
  FROM priorities p
  JOIN duplicate_fire_auto dfa ON p.user_id = dfa.user_id 
    AND p.title = dfa.title
    AND p.priority_type = dfa.priority_type
    AND p.is_deleted = false
  WHERE p.created_at > dfa.keep_created_at
)
UPDATE priorities 
SET is_deleted = true, deleted_at = NOW()
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Clean up duplicate manual priorities by title
WITH duplicate_manual AS (
  SELECT 
    user_id, 
    title,
    priority_type,
    MIN(created_at) as keep_created_at
  FROM priorities 
  WHERE priority_type = 'manual' 
    AND is_deleted = false
  GROUP BY user_id, title, priority_type
  HAVING COUNT(*) > 1
),
duplicates_to_delete AS (
  SELECT p.id
  FROM priorities p
  JOIN duplicate_manual dm ON p.user_id = dm.user_id 
    AND p.title = dm.title
    AND p.priority_type = dm.priority_type
    AND p.is_deleted = false
  WHERE p.created_at > dm.keep_created_at
)
UPDATE priorities 
SET is_deleted = true, deleted_at = NOW()
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Add unique constraint to prevent future duplicates
-- Since we can't use partial indexes with the current table structure,
-- we'll add a simple unique constraint on user_id + title + priority_type

ALTER TABLE priorities 
ADD CONSTRAINT unique_priority_per_user_title_type 
UNIQUE (user_id, title, priority_type);
