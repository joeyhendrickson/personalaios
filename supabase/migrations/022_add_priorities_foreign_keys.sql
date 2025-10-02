-- Migration: Add foreign key columns to priorities table
-- This adds task_id and project_id columns to link priorities to specific tasks/projects

-- Add foreign key columns to priorities table
ALTER TABLE priorities 
ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
ADD COLUMN project_id UUID REFERENCES weekly_goals(id) ON DELETE CASCADE,
ADD COLUMN source_type VARCHAR(20) DEFAULT 'manual', -- manual, project, task
ADD COLUMN manual_order INTEGER DEFAULT 0;

-- Create indexes for the new foreign key columns
CREATE INDEX idx_priorities_task_id ON priorities(task_id);
CREATE INDEX idx_priorities_project_id ON priorities(project_id);
CREATE INDEX idx_priorities_source_type ON priorities(source_type);

-- Update existing priorities to have source_type 'manual'
UPDATE priorities SET source_type = 'manual' WHERE source_type IS NULL;
