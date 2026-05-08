-- Daily / snapshot biometrics for Fitness Tracker (sleep, vitals, stress, energy, optional screenshots)

CREATE TABLE IF NOT EXISTS fitness_biometrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),

  sleep_hours DECIMAL(5, 2),
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  resting_heart_rate INT,
  stress_level_1_10 INT CHECK (stress_level_1_10 >= 1 AND stress_level_1_10 <= 10),
  energy_level_self_1_10 INT CHECK (energy_level_self_1_10 >= 1 AND energy_level_self_1_10 <= 10),
  contextual_energy_level_1_10 INT CHECK (
    contextual_energy_level_1_10 >= 1 AND contextual_energy_level_1_10 <= 10
  ),

  iphone_summary_image_url TEXT,
  fitbit_opt_in BOOLEAN DEFAULT FALSE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fitness_biometrics_user_recorded
  ON fitness_biometrics(user_id, recorded_at DESC);

ALTER TABLE fitness_biometrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fitness biometrics"
  ON fitness_biometrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fitness biometrics"
  ON fitness_biometrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fitness biometrics"
  ON fitness_biometrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fitness biometrics"
  ON fitness_biometrics FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_fitness_biometrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fitness_biometrics_updated_at ON fitness_biometrics;
CREATE TRIGGER trg_fitness_biometrics_updated_at
  BEFORE UPDATE ON fitness_biometrics
  FOR EACH ROW
  EXECUTE FUNCTION update_fitness_biometrics_updated_at();
