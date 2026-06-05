-- Dedicated storage for Fitness Tracker diet/nutrition preferences.
-- Previously these lived inside profiles.assessment_data (Dream Catcher column),
-- which is not present in every environment. A standalone table makes the
-- "Save Diet Preferences" flow reliable and independent of the profiles schema.

CREATE TABLE IF NOT EXISTS nutrition_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  diet_type TEXT,
  diet_modifications TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nutrition_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own nutrition preferences" ON nutrition_preferences;
CREATE POLICY "Users can view their own nutrition preferences"
  ON nutrition_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own nutrition preferences" ON nutrition_preferences;
CREATE POLICY "Users can insert their own nutrition preferences"
  ON nutrition_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own nutrition preferences" ON nutrition_preferences;
CREATE POLICY "Users can update their own nutrition preferences"
  ON nutrition_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own nutrition preferences" ON nutrition_preferences;
CREATE POLICY "Users can delete their own nutrition preferences"
  ON nutrition_preferences FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_nutrition_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nutrition_preferences_updated_at ON nutrition_preferences;
CREATE TRIGGER trg_nutrition_preferences_updated_at
  BEFORE UPDATE ON nutrition_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_nutrition_preferences_updated_at();
