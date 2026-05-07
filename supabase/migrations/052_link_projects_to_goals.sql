-- Link dashboard projects to user goals.
-- Adds optional FK `projects.goal_id` → `goals.id` so the advisor can evaluate planning maturity
-- (projects per goal, orphan projects, goals without projects).

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_goal_id ON public.projects(goal_id);

