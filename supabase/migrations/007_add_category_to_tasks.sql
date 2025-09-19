-- Migration: Add category field to tasks table
-- This allows tasks to have categories for better organization and progress tracking

-- Add category column to tasks table
ALTER TABLE tasks ADD COLUMN category goal_category NOT NULL DEFAULT 'other';

-- Create index for better performance on category queries
CREATE INDEX idx_tasks_category ON tasks(category);

