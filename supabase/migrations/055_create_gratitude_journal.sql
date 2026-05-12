-- Gratitude Journal: nightly challenge to record 3 things you're thankful for

CREATE TABLE IF NOT EXISTS gratitude_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gratitude_items JSONB NOT NULL DEFAULT '[]',
  reflection TEXT,
  mood_rating INT CHECK (mood_rating >= 1 AND mood_rating <= 5),
  challenge_completed BOOLEAN GENERATED ALWAYS AS (jsonb_array_length(gratitude_items) >= 3) STORED,

  points_awarded INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_gratitude_journal_user_date
  ON gratitude_journal_entries(user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_gratitude_journal_challenge
  ON gratitude_journal_entries(user_id, challenge_completed)
  WHERE challenge_completed = true;

ALTER TABLE gratitude_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gratitude entries"
  ON gratitude_journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gratitude entries"
  ON gratitude_journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gratitude entries"
  ON gratitude_journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gratitude entries"
  ON gratitude_journal_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_gratitude_journal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gratitude_journal_updated_at ON gratitude_journal_entries;
CREATE TRIGGER trg_gratitude_journal_updated_at
  BEFORE UPDATE ON gratitude_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_gratitude_journal_updated_at();
