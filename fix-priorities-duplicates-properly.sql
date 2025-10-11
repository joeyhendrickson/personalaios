-- Fix priorities duplicates by adding proper unique constraints
-- This prevents duplicates at the database level instead of trying to clean them up after

-- First, clean up existing duplicates before adding constraints
-- This will remove duplicates and keep the oldest one

-- Clean up duplicate projects first
WITH duplicate_projects AS (
  SELECT 
    user_id, 
    project_id,
    MIN(created_at) as keep_created_at
  FROM priorities 
  WHERE priority_type = 'fire_auto' 
    AND source_type = 'project' 
    AND project_id IS NOT NULL
    AND is_deleted = false
  GROUP BY user_id, project_id
  HAVING COUNT(*) > 1
),
duplicates_to_delete AS (
  SELECT p.id
  FROM priorities p
  JOIN duplicate_projects dp ON p.user_id = dp.user_id 
    AND p.project_id = dp.project_id
    AND p.priority_type = 'fire_auto'
    AND p.source_type = 'project'
    AND p.is_deleted = false
  WHERE p.created_at > dp.keep_created_at
)
UPDATE priorities 
SET is_deleted = true, deleted_at = NOW()
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Clean up duplicate tasks
WITH duplicate_tasks AS (
  SELECT 
    user_id, 
    task_id,
    MIN(created_at) as keep_created_at
  FROM priorities 
  WHERE priority_type = 'fire_auto' 
    AND source_type = 'task' 
    AND task_id IS NOT NULL
    AND is_deleted = false
  GROUP BY user_id, task_id
  HAVING COUNT(*) > 1
),
duplicates_to_delete AS (
  SELECT p.id
  FROM priorities p
  JOIN duplicate_tasks dt ON p.user_id = dt.user_id 
    AND p.task_id = dt.task_id
    AND p.priority_type = 'fire_auto'
    AND p.source_type = 'task'
    AND p.is_deleted = false
  WHERE p.created_at > dt.keep_created_at
)
UPDATE priorities 
SET is_deleted = true, deleted_at = NOW()
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Now add unique constraints to prevent future duplicates
-- Note: PostgreSQL unique constraints don't support WHERE clauses directly
-- We'll create partial unique indexes instead

-- Create partial unique index for fire_auto priorities from projects
CREATE UNIQUE INDEX IF NOT EXISTS unique_fire_auto_project 
ON priorities (user_id, project_id) 
WHERE priority_type = 'fire_auto' AND source_type = 'project' AND project_id IS NOT NULL;

-- Create partial unique index for fire_auto priorities from tasks  
CREATE UNIQUE INDEX IF NOT EXISTS unique_fire_auto_task 
ON priorities (user_id, task_id) 
WHERE priority_type = 'fire_auto' AND source_type = 'task' AND task_id IS NOT NULL;

-- Create partial unique index for manual priorities with same title
CREATE UNIQUE INDEX IF NOT EXISTS unique_manual_title 
ON priorities (user_id, title) 
WHERE priority_type = 'manual';

-- Add regular indexes for better performance on these lookups
CREATE INDEX IF NOT EXISTS idx_priorities_fire_auto_project ON priorities(user_id, priority_type, source_type, project_id) 
WHERE priority_type = 'fire_auto' AND source_type = 'project';

CREATE INDEX IF NOT EXISTS idx_priorities_fire_auto_task ON priorities(user_id, priority_type, source_type, task_id) 
WHERE priority_type = 'fire_auto' AND source_type = 'task';
