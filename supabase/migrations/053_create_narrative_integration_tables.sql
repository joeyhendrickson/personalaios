-- Narrative Integration (I Am Present) module
-- Purpose: AI-guided reflective journaling for narrative integration (NOT therapy).

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'narrative_integration_safety_status') THEN
    CREATE TYPE narrative_integration_safety_status AS ENUM ('ok', 'needs_grounding', 'high_risk');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'narrative_integration_phase') THEN
    CREATE TYPE narrative_integration_phase AS ENUM (
      'state_check',
      'stabilization',
      'event_inventory',
      'rumination_analysis',
      'narrative_clarification',
      'frozen_belief',
      'meaning_making',
      'present_grounding',
      'future_reorientation',
      'closure_summary'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'narrative_integration_completion_status') THEN
    CREATE TYPE narrative_integration_completion_status AS ENUM ('in_progress', 'completed', 'aborted');
  END IF;
END
$$;

-- Sessions
CREATE TABLE IF NOT EXISTS narrative_integration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  title TEXT,
  event_summary TEXT,

  stress_level INT CHECK (stress_level BETWEEN 1 AND 10),
  rumination_level INT CHECK (rumination_level BETWEEN 1 AND 10),
  engagement_level INT CHECK (engagement_level BETWEEN 1 AND 10),

  dissociation_indicators BOOLEAN DEFAULT false,
  safety_status narrative_integration_safety_status NOT NULL DEFAULT 'ok',
  current_phase narrative_integration_phase NOT NULL DEFAULT 'state_check',

  user_goal TEXT,
  emotional_state TEXT,
  readiness_to_process BOOLEAN,

  meaning_statement TEXT,
  lesson_statement TEXT,
  present_grounding_summary TEXT,
  future_action TEXT,

  completion_status narrative_integration_completion_status NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_narrative_integration_sessions_user_id
  ON narrative_integration_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_narrative_integration_sessions_created_at
  ON narrative_integration_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_narrative_integration_sessions_status
  ON narrative_integration_sessions(user_id, completion_status, updated_at DESC);

-- Narrative event (coherent narrative + frozen belief + lesson)
CREATE TABLE IF NOT EXISTS narrative_integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES narrative_integration_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  event_name TEXT,
  approximate_time_period TEXT,
  people_involved_optional TEXT,
  what_happened_briefly TEXT,
  emotional_impact TEXT,
  what_question_keeps_repeating TEXT,
  what_belief_formed_afterward TEXT,
  how_it_affects_life_now TEXT,

  brief_description TEXT,
  unresolved_question TEXT,
  frozen_belief TEXT,
  current_reinterpretation TEXT,
  extracted_lesson TEXT,
  integration_score INT CHECK (integration_score BETWEEN 1 AND 10)
);

CREATE INDEX IF NOT EXISTS idx_narrative_integration_events_session_id
  ON narrative_integration_events(session_id);

-- Meaning extraction
CREATE TABLE IF NOT EXISTS narrative_integration_meaning_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES narrative_integration_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  category TEXT,
  user_selected_meaning TEXT,
  ai_suggested_meanings JSONB DEFAULT '[]'::jsonb,
  final_meaning_statement TEXT,
  confidence_level INT CHECK (confidence_level BETWEEN 1 AND 10),
  user_edited BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_narrative_integration_meaning_session_id
  ON narrative_integration_meaning_extractions(session_id);

-- Future reorientation
CREATE TABLE IF NOT EXISTS narrative_integration_future_reorientations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES narrative_integration_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  linked_goal_id_optional UUID,
  linked_project_id_optional UUID,

  next_action TEXT,
  user_commitment TEXT,
  follow_up_date_optional DATE
);

CREATE INDEX IF NOT EXISTS idx_narrative_integration_future_session_id
  ON narrative_integration_future_reorientations(session_id);

-- Conversation messages (for analysis and session continuity)
CREATE TABLE IF NOT EXISTS narrative_integration_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES narrative_integration_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  rumination_score INT CHECK (rumination_score BETWEEN 1 AND 10),
  rumination_pattern TEXT,
  phase narrative_integration_phase
);

CREATE INDEX IF NOT EXISTS idx_narrative_integration_messages_session_id
  ON narrative_integration_messages(session_id, created_at ASC);

-- Saved artifact: Narrative Integration Summary
CREATE TABLE IF NOT EXISTS narrative_integration_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES narrative_integration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  title TEXT,
  event_brief TEXT,
  old_belief TEXT,
  updated_belief TEXT,
  meaning_statement TEXT,
  lesson_learned TEXT,
  gratitude_or_grounding_statement TEXT,
  future_action TEXT,
  date_completed TIMESTAMPTZ,
  revisit_guidance TEXT
);

CREATE INDEX IF NOT EXISTS idx_narrative_integration_summaries_user_id
  ON narrative_integration_summaries(user_id, date_completed DESC);

-- RLS
ALTER TABLE narrative_integration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_integration_meaning_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_integration_future_reorientations ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_integration_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_integration_summaries ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Users can view their own narrative integration sessions"
  ON narrative_integration_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own narrative integration sessions"
  ON narrative_integration_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own narrative integration sessions"
  ON narrative_integration_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own narrative integration sessions"
  ON narrative_integration_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Child tables policies: derive ownership from parent session
CREATE POLICY "Users can access their own narrative integration events"
  ON narrative_integration_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM narrative_integration_sessions s
      WHERE s.id = narrative_integration_events.session_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM narrative_integration_sessions s
      WHERE s.id = narrative_integration_events.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their own narrative integration meaning extractions"
  ON narrative_integration_meaning_extractions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM narrative_integration_sessions s
      WHERE s.id = narrative_integration_meaning_extractions.session_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM narrative_integration_sessions s
      WHERE s.id = narrative_integration_meaning_extractions.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their own narrative integration future reorientations"
  ON narrative_integration_future_reorientations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM narrative_integration_sessions s
      WHERE s.id = narrative_integration_future_reorientations.session_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM narrative_integration_sessions s
      WHERE s.id = narrative_integration_future_reorientations.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their own narrative integration messages"
  ON narrative_integration_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM narrative_integration_sessions s
      WHERE s.id = narrative_integration_messages.session_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM narrative_integration_sessions s
      WHERE s.id = narrative_integration_messages.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their own narrative integration summaries"
  ON narrative_integration_summaries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_narrative_integration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_narrative_integration_sessions_updated_at ON narrative_integration_sessions;
CREATE TRIGGER trg_narrative_integration_sessions_updated_at
  BEFORE UPDATE ON narrative_integration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_narrative_integration_updated_at();

DROP TRIGGER IF EXISTS trg_narrative_integration_events_updated_at ON narrative_integration_events;
CREATE TRIGGER trg_narrative_integration_events_updated_at
  BEFORE UPDATE ON narrative_integration_events
  FOR EACH ROW
  EXECUTE FUNCTION update_narrative_integration_updated_at();

DROP TRIGGER IF EXISTS trg_narrative_integration_meaning_updated_at ON narrative_integration_meaning_extractions;
CREATE TRIGGER trg_narrative_integration_meaning_updated_at
  BEFORE UPDATE ON narrative_integration_meaning_extractions
  FOR EACH ROW
  EXECUTE FUNCTION update_narrative_integration_updated_at();

DROP TRIGGER IF EXISTS trg_narrative_integration_future_updated_at ON narrative_integration_future_reorientations;
CREATE TRIGGER trg_narrative_integration_future_updated_at
  BEFORE UPDATE ON narrative_integration_future_reorientations
  FOR EACH ROW
  EXECUTE FUNCTION update_narrative_integration_updated_at();

