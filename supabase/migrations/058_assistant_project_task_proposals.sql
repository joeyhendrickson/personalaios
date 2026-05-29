-- Extend assistant proposals for projects and tasks (always linked to goals / projects).

ALTER TABLE assistant_action_proposals
  DROP CONSTRAINT IF EXISTS assistant_action_proposals_action_type_check;

ALTER TABLE assistant_action_proposals
  ADD CONSTRAINT assistant_action_proposals_action_type_check
  CHECK (action_type IN ('create_goal', 'create_project', 'create_task'));

ALTER TABLE assistant_action_proposals
  ADD COLUMN IF NOT EXISTS plan_group_id UUID;

ALTER TABLE assistant_action_proposals
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_assistant_action_proposals_plan_group
  ON assistant_action_proposals (user_id, plan_group_id, status);
