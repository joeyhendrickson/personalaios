-- Potential income and spending for Budget Advisor (1–3 month horizon, not yet committed).

CREATE TABLE IF NOT EXISTS potential_income (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  months_out INTEGER NOT NULL DEFAULT 1 CHECK (months_out BETWEEN 1 AND 3),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS potential_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  months_out INTEGER NOT NULL DEFAULT 1 CHECK (months_out BETWEEN 1 AND 3),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_potential_income_user_id ON potential_income(user_id);
CREATE INDEX IF NOT EXISTS idx_potential_income_active ON potential_income(is_active);
CREATE INDEX IF NOT EXISTS idx_potential_expenses_user_id ON potential_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_potential_expenses_active ON potential_expenses(is_active);

DROP TRIGGER IF EXISTS update_potential_income_updated_at ON potential_income;
CREATE TRIGGER update_potential_income_updated_at
  BEFORE UPDATE ON potential_income
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_potential_expenses_updated_at ON potential_expenses;
CREATE TRIGGER update_potential_expenses_updated_at
  BEFORE UPDATE ON potential_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE potential_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE potential_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own potential income" ON potential_income;
CREATE POLICY "Users can view their own potential income"
  ON potential_income FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own potential income" ON potential_income;
CREATE POLICY "Users can insert their own potential income"
  ON potential_income FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own potential income" ON potential_income;
CREATE POLICY "Users can update their own potential income"
  ON potential_income FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own potential income" ON potential_income;
CREATE POLICY "Users can delete their own potential income"
  ON potential_income FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own potential expenses" ON potential_expenses;
CREATE POLICY "Users can view their own potential expenses"
  ON potential_expenses FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own potential expenses" ON potential_expenses;
CREATE POLICY "Users can insert their own potential expenses"
  ON potential_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own potential expenses" ON potential_expenses;
CREATE POLICY "Users can update their own potential expenses"
  ON potential_expenses FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own potential expenses" ON potential_expenses;
CREATE POLICY "Users can delete their own potential expenses"
  ON potential_expenses FOR DELETE USING (auth.uid() = user_id);
