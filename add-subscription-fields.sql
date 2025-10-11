-- Add PayPal subscription fields to support recurring payments
-- Run this in your Supabase SQL editor

-- Add paypal_subscription_id to subscriptions table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'paypal_subscription_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN paypal_subscription_id VARCHAR(255) UNIQUE;
  END IF;
END $$;

-- Add paypal_subscription_id to payments table for linking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'paypal_subscription_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN paypal_subscription_id VARCHAR(255);
  END IF;
END $$;

-- Create index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_id ON subscriptions(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(paypal_subscription_id);

-- Add webhook_events table to log all webhook activity
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  resource_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'received',
  payload JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for webhook event lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_resource ON webhook_events(resource_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at);

-- Enable RLS on webhook_events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Admins can view webhook events
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admins can view webhook events" ON webhook_events;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Admins can view webhook events" ON webhook_events
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = auth.jwt() ->> 'email' 
        AND is_active = true
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- System can insert webhook events
GRANT SELECT, INSERT, UPDATE ON webhook_events TO anon, authenticated;

-- Success message
SELECT 'PayPal webhook support added successfully!' as status;
