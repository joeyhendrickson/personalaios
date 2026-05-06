-- User-verified transaction windows: compact summaries for AI prompts + content fingerprint for invalidation.
CREATE TABLE IF NOT EXISTS budget_verified_transaction_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  content_fingerprint TEXT NOT NULL,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT budget_verified_period_range_ok CHECK (start_date <= end_date),
  UNIQUE (user_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_budget_verified_periods_user_dates
  ON budget_verified_transaction_periods (user_id, start_date, end_date);

ALTER TABLE budget_verified_transaction_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_verified_periods_select"
  ON budget_verified_transaction_periods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "budget_verified_periods_insert"
  ON budget_verified_transaction_periods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budget_verified_periods_update"
  ON budget_verified_transaction_periods FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "budget_verified_periods_delete"
  ON budget_verified_transaction_periods FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE budget_verified_transaction_periods IS
  'User-saved verified date ranges; summary_json + fingerprint reduce AI prompt size when unchanged.';
