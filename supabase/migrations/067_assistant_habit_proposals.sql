-- Allow the Advisor to propose habits (in addition to goals, projects, and tasks).

ALTER TABLE assistant_action_proposals
  DROP CONSTRAINT IF EXISTS assistant_action_proposals_action_type_check;

ALTER TABLE assistant_action_proposals
  ADD CONSTRAINT assistant_action_proposals_action_type_check
  CHECK (action_type IN ('create_goal', 'create_project', 'create_task', 'create_habit'));
