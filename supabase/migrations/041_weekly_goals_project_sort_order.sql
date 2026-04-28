-- Manual ordering for dashboard "Projects" (weekly_goals)
ALTER TABLE weekly_goals
  ADD COLUMN IF NOT EXISTS project_sort_order INTEGER NOT NULL DEFAULT 0;

-- Newest-first list: lower numbers appear first when ordering ASC (matches prior created_at DESC UX)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        created_at DESC
    ) - 1 AS rn
  FROM weekly_goals
)
UPDATE weekly_goals wg
SET
  project_sort_order = ranked.rn
FROM
  ranked
WHERE
  wg.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_project_sort ON weekly_goals (user_id, project_sort_order);

COMMENT ON COLUMN weekly_goals.project_sort_order IS 'Dashboard project list order; lower value appears first.';
