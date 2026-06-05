-- Migration: Ensure daily_habits rows can be updated (title/description/points edits)
-- Some environments were provisioned via ad-hoc scripts that missed the UPDATE
-- policy or the updated_at trigger, which silently blocks habit edits. This
-- re-asserts both idempotently.

-- 1) Ensure the shared updated_at helper exists.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 2) Ensure RLS is enabled and the UPDATE policy exists (with WITH CHECK).
ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update their own habits" ON daily_habits;
CREATE POLICY "Users can update their own habits" ON daily_habits
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3) Ensure the updated_at trigger is present.
DROP TRIGGER IF EXISTS update_daily_habits_updated_at ON daily_habits;
CREATE TRIGGER update_daily_habits_updated_at
  BEFORE UPDATE ON daily_habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
