-- The trial signup flow links a trial to the user account it created, but the
-- trial_subscriptions table (created outside migrations) lacked a user_id column,
-- causing "Failed to create trial subscription". Add it idempotently.

ALTER TABLE IF EXISTS trial_subscriptions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_user_id
  ON trial_subscriptions(user_id);
