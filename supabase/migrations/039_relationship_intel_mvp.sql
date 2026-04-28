-- Relationship Intelligence MVP (manual ingest; no external APIs)
-- Tables use ri_* prefix in public schema so PostgREST exposes them without
-- extra "exposed schemas" configuration (unlike a dedicated Postgres schema).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE ri_perceived_relationship_state AS ENUM (
  'clean',
  'neutral',
  'damaged'
);

CREATE TYPE ri_interaction_kind AS ENUM (
  'message',
  'call',
  'hangout',
  'project',
  'other'
);

CREATE TYPE ri_person_goal_link_type AS ENUM (
  'advisor',
  'collaborator',
  'potential',
  'none'
);

-- ---------------------------------------------------------------------------
-- ri_people (product spec: people)
-- ---------------------------------------------------------------------------
CREATE TABLE ri_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  perceived_relationship_state ri_perceived_relationship_state NOT NULL DEFAULT 'neutral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ri_people_user ON ri_people (user_id);

CREATE INDEX idx_ri_people_created ON ri_people (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- ri_interactions (product spec: interactions)
-- ---------------------------------------------------------------------------
CREATE TABLE ri_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES ri_people (id) ON DELETE CASCADE,
  type ri_interaction_kind NOT NULL,
  content TEXT NOT NULL,
  interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ri_interactions_person ON ri_interactions (person_id, interaction_at DESC);

CREATE INDEX idx_ri_interactions_user ON ri_interactions (user_id);

-- ---------------------------------------------------------------------------
-- ri_relationship_scores
-- ---------------------------------------------------------------------------
CREATE TABLE ri_relationship_scores (
  person_id UUID PRIMARY KEY REFERENCES ri_people (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  friend_score REAL NOT NULL CHECK (
    friend_score >= 0
    AND friend_score <= 1
  ),
  goal_score REAL NOT NULL CHECK (
    goal_score >= 0
    AND goal_score <= 1
  ),
  trajectory_score REAL NOT NULL CHECK (
    trajectory_score >= 0
    AND trajectory_score <= 1
  ),
  signals JSONB NOT NULL DEFAULT '{}',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ri_scores_user ON ri_relationship_scores (user_id);

-- ---------------------------------------------------------------------------
-- ri_person_goal_links
-- ---------------------------------------------------------------------------
CREATE TABLE ri_person_goal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES ri_people (id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.goals (id) ON DELETE CASCADE,
  link_type ri_person_goal_link_type NOT NULL,
  strength REAL NOT NULL DEFAULT 0 CHECK (
    strength >= 0
    AND strength <= 1
  ),
  evidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (person_id, goal_id)
);

CREATE INDEX idx_ri_pgl_user ON ri_person_goal_links (user_id);

CREATE INDEX idx_ri_pgl_person ON ri_person_goal_links (person_id);

-- ---------------------------------------------------------------------------
-- goals: optional category
-- ---------------------------------------------------------------------------
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS category VARCHAR(100);

COMMENT ON COLUMN public.goals.category IS 'Optional user-facing category for Relationship Intel / reporting';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE ri_people ENABLE ROW LEVEL SECURITY;

ALTER TABLE ri_interactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE ri_relationship_scores ENABLE ROW LEVEL SECURITY;

ALTER TABLE ri_person_goal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ri_people_select" ON ri_people FOR SELECT TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "ri_people_insert" ON ri_people FOR INSERT TO authenticated WITH CHECK (auth.uid () = user_id);

CREATE POLICY "ri_people_update" ON ri_people FOR UPDATE TO authenticated USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

CREATE POLICY "ri_people_delete" ON ri_people FOR DELETE TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "ri_interactions_select" ON ri_interactions FOR SELECT TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "ri_interactions_insert" ON ri_interactions FOR INSERT TO authenticated WITH CHECK (auth.uid () = user_id);

CREATE POLICY "ri_interactions_update" ON ri_interactions FOR UPDATE TO authenticated USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

CREATE POLICY "ri_interactions_delete" ON ri_interactions FOR DELETE TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "ri_scores_select" ON ri_relationship_scores FOR SELECT TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "ri_scores_insert" ON ri_relationship_scores FOR INSERT TO authenticated WITH CHECK (auth.uid () = user_id);

CREATE POLICY "ri_scores_update" ON ri_relationship_scores FOR UPDATE TO authenticated USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

CREATE POLICY "ri_scores_delete" ON ri_relationship_scores FOR DELETE TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "ri_pgl_select" ON ri_person_goal_links FOR SELECT TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "ri_pgl_insert" ON ri_person_goal_links FOR INSERT TO authenticated WITH CHECK (auth.uid () = user_id);

CREATE POLICY "ri_pgl_update" ON ri_person_goal_links FOR UPDATE TO authenticated USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

CREATE POLICY "ri_pgl_delete" ON ri_person_goal_links FOR DELETE TO authenticated USING (auth.uid () = user_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ri_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ri_people_updated_at
  BEFORE UPDATE ON ri_people FOR EACH ROW
  EXECUTE FUNCTION ri_set_updated_at();
