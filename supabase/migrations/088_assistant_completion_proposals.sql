-- Allow completion proposals from the Advisor (mark task/habit done after user confirms)

ALTER TABLE assistant_action_proposals
  DROP CONSTRAINT IF EXISTS assistant_action_proposals_action_type_check;

ALTER TABLE assistant_action_proposals
  ADD CONSTRAINT assistant_action_proposals_action_type_check
  CHECK (action_type IN (
    'create_goal',
    'create_project',
    'create_task',
    'create_habit',
    'complete_task',
    'complete_habit'
  ));
