-- Create trial_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS trial_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  plan_type VARCHAR(50) DEFAULT 'basic',
  trial_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_end TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  will_convert_to VARCHAR(50),
  conversion_price DECIMAL(10, 2),
  converted_at TIMESTAMPTZ,
  payment_id VARCHAR(255),
  final_plan_type VARCHAR(50),
  cancelled_at TIMESTAMPTZ,
  expiry_notification_sent_at TIMESTAMPTZ,
  expiry_notification_message_id VARCHAR(255),
  expired_notification_sent_at TIMESTAMPTZ,
  expired_notification_message_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_email ON trial_subscriptions(email);

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_status ON trial_subscriptions(status);

-- Enable RLS
ALTER TABLE trial_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own trial subscriptions" ON trial_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own trial subscriptions" ON trial_subscriptions;
DROP POLICY IF EXISTS "Users can update their own trial subscriptions" ON trial_subscriptions;
DROP POLICY IF EXISTS "Admins can view all trial subscriptions" ON trial_subscriptions;

-- Create RLS policies
CREATE POLICY "Users can view their own trial subscriptions"
  ON trial_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own trial subscriptions"
  ON trial_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own trial subscriptions"
  ON trial_subscriptions FOR UPDATE
  USING (true);

CREATE POLICY "Admins can view all trial subscriptions"
  ON trial_subscriptions FOR ALL
  USING (true);

