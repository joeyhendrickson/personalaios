-- Sobriety Tracker: daily logs, decision journal, badges, and influence places

CREATE TABLE IF NOT EXISTS sobriety_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  typical_drink_cost NUMERIC(10, 2) NOT NULL DEFAULT 8,
  typical_drinks_per_week NUMERIC(8, 2) NOT NULL DEFAULT 7,
  typical_drink_label TEXT NOT NULL DEFAULT 'drink',
  sobriety_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sobriety_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  drank BOOLEAN NOT NULL DEFAULT false,
  drink_count INT NOT NULL DEFAULT 0 CHECK (drink_count >= 0),
  estimated_spend NUMERIC(10, 2),
  notes TEXT,
  points_awarded INT NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'budget_place')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_sobriety_daily_logs_user_date
  ON sobriety_daily_logs (user_id, log_date DESC);

CREATE TABLE IF NOT EXISTS sobriety_decision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drink_log_id UUID REFERENCES sobriety_daily_logs(id) ON DELETE SET NULL,
  drink_date DATE NOT NULL,
  day_offset INT NOT NULL CHECK (day_offset IN (0, 1, 2)),
  content TEXT NOT NULL DEFAULT '',
  has_rumination BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, drink_date, day_offset)
);

CREATE INDEX IF NOT EXISTS idx_sobriety_decision_logs_user_date
  ON sobriety_decision_logs (user_id, drink_date DESC);

CREATE TABLE IF NOT EXISTS sobriety_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_sobriety_user_badges_user
  ON sobriety_user_badges (user_id, earned_at DESC);

CREATE TABLE IF NOT EXISTS sobriety_influence_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('bar', 'restaurant', 'other')),
  visit_count INT NOT NULL DEFAULT 1 CHECK (visit_count >= 0),
  last_seen_date DATE,
  total_spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
  highlighted BOOLEAN NOT NULL DEFAULT true,
  user_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, merchant_name)
);

CREATE INDEX IF NOT EXISTS idx_sobriety_influence_places_user
  ON sobriety_influence_places (user_id, highlighted, last_seen_date DESC);

CREATE TABLE IF NOT EXISTS sobriety_place_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id UUID REFERENCES sobriety_influence_places(id) ON DELETE CASCADE,
  transaction_id TEXT,
  visit_date DATE NOT NULL,
  amount NUMERIC(10, 2),
  merchant_name TEXT NOT NULL,
  added_to_log BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sobriety_place_visits_user_date
  ON sobriety_place_visits (user_id, visit_date DESC);

ALTER TABLE sobriety_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sobriety_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sobriety_decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sobriety_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sobriety_influence_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE sobriety_place_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sobriety profiles" ON sobriety_profiles;
CREATE POLICY "Users can view their own sobriety profiles"
  ON sobriety_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own sobriety profiles" ON sobriety_profiles;
CREATE POLICY "Users can insert their own sobriety profiles"
  ON sobriety_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own sobriety profiles" ON sobriety_profiles;
CREATE POLICY "Users can update their own sobriety profiles"
  ON sobriety_profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own sobriety logs" ON sobriety_daily_logs;
CREATE POLICY "Users can view their own sobriety logs"
  ON sobriety_daily_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own sobriety logs" ON sobriety_daily_logs;
CREATE POLICY "Users can insert their own sobriety logs"
  ON sobriety_daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own sobriety logs" ON sobriety_daily_logs;
CREATE POLICY "Users can update their own sobriety logs"
  ON sobriety_daily_logs FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own sobriety logs" ON sobriety_daily_logs;
CREATE POLICY "Users can delete their own sobriety logs"
  ON sobriety_daily_logs FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own sobriety decisions" ON sobriety_decision_logs;
CREATE POLICY "Users can view their own sobriety decisions"
  ON sobriety_decision_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own sobriety decisions" ON sobriety_decision_logs;
CREATE POLICY "Users can insert their own sobriety decisions"
  ON sobriety_decision_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own sobriety decisions" ON sobriety_decision_logs;
CREATE POLICY "Users can update their own sobriety decisions"
  ON sobriety_decision_logs FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own sobriety decisions" ON sobriety_decision_logs;
CREATE POLICY "Users can delete their own sobriety decisions"
  ON sobriety_decision_logs FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own sobriety badges" ON sobriety_user_badges;
CREATE POLICY "Users can view their own sobriety badges"
  ON sobriety_user_badges FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own sobriety badges" ON sobriety_user_badges;
CREATE POLICY "Users can insert their own sobriety badges"
  ON sobriety_user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own sobriety places" ON sobriety_influence_places;
CREATE POLICY "Users can view their own sobriety places"
  ON sobriety_influence_places FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own sobriety places" ON sobriety_influence_places;
CREATE POLICY "Users can insert their own sobriety places"
  ON sobriety_influence_places FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own sobriety places" ON sobriety_influence_places;
CREATE POLICY "Users can update their own sobriety places"
  ON sobriety_influence_places FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own sobriety places" ON sobriety_influence_places;
CREATE POLICY "Users can delete their own sobriety places"
  ON sobriety_influence_places FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own sobriety place visits" ON sobriety_place_visits;
CREATE POLICY "Users can view their own sobriety place visits"
  ON sobriety_place_visits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own sobriety place visits" ON sobriety_place_visits;
CREATE POLICY "Users can insert their own sobriety place visits"
  ON sobriety_place_visits FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own sobriety place visits" ON sobriety_place_visits;
CREATE POLICY "Users can update their own sobriety place visits"
  ON sobriety_place_visits FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own sobriety place visits" ON sobriety_place_visits;
CREATE POLICY "Users can delete their own sobriety place visits"
  ON sobriety_place_visits FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_sobriety_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sobriety_profiles_updated_at ON sobriety_profiles;
CREATE TRIGGER trg_sobriety_profiles_updated_at
  BEFORE UPDATE ON sobriety_profiles
  FOR EACH ROW EXECUTE FUNCTION update_sobriety_updated_at();

DROP TRIGGER IF EXISTS trg_sobriety_daily_logs_updated_at ON sobriety_daily_logs;
CREATE TRIGGER trg_sobriety_daily_logs_updated_at
  BEFORE UPDATE ON sobriety_daily_logs
  FOR EACH ROW EXECUTE FUNCTION update_sobriety_updated_at();

DROP TRIGGER IF EXISTS trg_sobriety_decision_logs_updated_at ON sobriety_decision_logs;
CREATE TRIGGER trg_sobriety_decision_logs_updated_at
  BEFORE UPDATE ON sobriety_decision_logs
  FOR EACH ROW EXECUTE FUNCTION update_sobriety_updated_at();

DROP TRIGGER IF EXISTS trg_sobriety_influence_places_updated_at ON sobriety_influence_places;
CREATE TRIGGER trg_sobriety_influence_places_updated_at
  BEFORE UPDATE ON sobriety_influence_places
  FOR EACH ROW EXECUTE FUNCTION update_sobriety_updated_at();
