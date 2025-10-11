-- Trial Email Notification System - Clean Version
-- Run this in your Supabase SQL editor

-- Add notification tracking columns to trial_subscriptions table if they don't exist
DO $$ 
BEGIN
  -- Add name column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trial_subscriptions' AND column_name = 'name'
  ) THEN
    ALTER TABLE trial_subscriptions ADD COLUMN name VARCHAR(255);
  END IF;

  -- Add expiry notification columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trial_subscriptions' AND column_name = 'expiry_notification_sent_at'
  ) THEN
    ALTER TABLE trial_subscriptions ADD COLUMN expiry_notification_sent_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trial_subscriptions' AND column_name = 'expiry_notification_message_id'
  ) THEN
    ALTER TABLE trial_subscriptions ADD COLUMN expiry_notification_message_id VARCHAR(255);
  END IF;

  -- Add expired notification columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trial_subscriptions' AND column_name = 'expired_notification_sent_at'
  ) THEN
    ALTER TABLE trial_subscriptions ADD COLUMN expired_notification_sent_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trial_subscriptions' AND column_name = 'expired_notification_message_id'
  ) THEN
    ALTER TABLE trial_subscriptions ADD COLUMN expired_notification_message_id VARCHAR(255);
  END IF;
END $$;

-- Create indexes for trial_subscriptions if they don't exist
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_notification 
ON trial_subscriptions(status, expiry_notification_sent_at);

CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_email 
ON trial_subscriptions(email);

CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_status 
ON trial_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_trial_end 
ON trial_subscriptions(trial_end);

-- Drop and recreate policies for trial_subscriptions
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admins can view all trial subscriptions" ON trial_subscriptions;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Admins can view all trial subscriptions" ON trial_subscriptions
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

-- Success message
SELECT 'Trial email notification tracking columns added successfully!' as status;
