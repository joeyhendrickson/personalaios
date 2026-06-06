-- AI-generated "Future State" physique projections for the Body Analysis tab.
-- Each row is an image generated from the user's recent body photos showing a
-- realistic improved physique N months out if they follow their plans.

CREATE TABLE IF NOT EXISTS fitness_future_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  timeframe_months INTEGER NOT NULL,
  source_photo_ids UUID[] DEFAULT '{}',
  prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fitness_future_states_user_created
  ON fitness_future_states(user_id, created_at DESC);

ALTER TABLE fitness_future_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own future states" ON fitness_future_states;
CREATE POLICY "Users can view their own future states"
  ON fitness_future_states FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own future states" ON fitness_future_states;
CREATE POLICY "Users can insert their own future states"
  ON fitness_future_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own future states" ON fitness_future_states;
CREATE POLICY "Users can delete their own future states"
  ON fitness_future_states FOR DELETE
  USING (auth.uid() = user_id);
