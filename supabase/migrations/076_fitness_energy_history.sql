-- Daily computed self-energy and stress scores (end-of-day snapshot)
CREATE TABLE IF NOT EXISTS fitness_energy_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  self_energy_level INT NOT NULL CHECK (self_energy_level >= 1 AND self_energy_level <= 10),
  stress_level INT NOT NULL CHECK (stress_level >= 1 AND stress_level <= 10),
  sleep_hours DECIMAL(5, 2),
  resting_heart_rate INT,
  steps INT,
  adjustments_applied JSONB NOT NULL DEFAULT '[]'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_fitness_energy_history_user_date
  ON fitness_energy_history(user_id, log_date DESC);

ALTER TABLE fitness_energy_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own energy history"
  ON fitness_energy_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own energy history"
  ON fitness_energy_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own energy history"
  ON fitness_energy_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_fitness_energy_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fitness_energy_history_updated_at ON fitness_energy_history;
CREATE TRIGGER trg_fitness_energy_history_updated_at
  BEFORE UPDATE ON fitness_energy_history
  FOR EACH ROW
  EXECUTE FUNCTION update_fitness_energy_history_updated_at();
