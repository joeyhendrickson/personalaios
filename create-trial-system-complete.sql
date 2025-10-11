-- Trial Subscriptions and Email Notification System
-- Run this in your Supabase SQL editor

-- Create access_codes table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_created_by ON access_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_access_codes_used_by ON access_codes(used_by);
CREATE INDEX IF NOT EXISTS idx_access_codes_active ON access_codes(is_active, expires_at);

-- Enable RLS
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all access codes" ON access_codes;
DROP POLICY IF EXISTS "Admins can create access codes" ON access_codes;
DROP POLICY IF EXISTS "Admins can update access codes" ON access_codes;
DROP POLICY IF EXISTS "Users can verify their own codes" ON access_codes;
DROP POLICY IF EXISTS "Anyone can check code validity" ON access_codes;

-- Create policies for access_codes
CREATE POLICY "Admins can view all access codes" ON access_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.jwt() ->> 'email' 
      AND is_active = true
    )
  );

CREATE POLICY "Admins can create access codes" ON access_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.jwt() ->> 'email' 
      AND is_active = true
    )
  );

CREATE POLICY "Admins can update access codes" ON access_codes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.jwt() ->> 'email' 
      AND is_active = true
    )
  );

CREATE POLICY "Anyone can check code validity" ON access_codes
  FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON access_codes TO anon, authenticated;

-- Create payments table for tracking PayPal payments (if it doesn't exist)
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paypal_order_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  plan_type VARCHAR(20) DEFAULT 'basic',
  status VARCHAR(20) DEFAULT 'pending',
  payment_details JSONB,
  user_email VARCHAR(255),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on paypal_order_id
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_email ON payments(user_email);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "System can insert payments" ON payments;

-- Create policies for payments
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert payments" ON payments
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON payments TO anon, authenticated;

-- Create trial_subscriptions table
CREATE TABLE IF NOT EXISTS trial_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  plan_type VARCHAR(20) DEFAULT 'basic',
  trial_start TIMESTAMP WITH TIME ZONE NOT NULL,
  trial_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  will_convert_to VARCHAR(20) DEFAULT 'basic',
  conversion_price DECIMAL(10,2) DEFAULT 49.99,
  converted_at TIMESTAMP WITH TIME ZONE,
  payment_id VARCHAR(255),
  final_plan_type VARCHAR(20),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  expiry_notification_sent_at TIMESTAMP WITH TIME ZONE,
  expiry_notification_message_id VARCHAR(255),
  expired_notification_sent_at TIMESTAMP WITH TIME ZONE,
  expired_notification_message_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add notification tracking columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  ALTER TABLE trial_subscriptions ADD COLUMN IF NOT EXISTS expiry_notification_sent_at TIMESTAMP WITH TIME ZONE;
  ALTER TABLE trial_subscriptions ADD COLUMN IF NOT EXISTS expiry_notification_message_id VARCHAR(255);
  ALTER TABLE trial_subscriptions ADD COLUMN IF NOT EXISTS expired_notification_sent_at TIMESTAMP WITH TIME ZONE;
  ALTER TABLE trial_subscriptions ADD COLUMN IF NOT EXISTS expired_notification_message_id VARCHAR(255);
  ALTER TABLE trial_subscriptions ADD COLUMN IF NOT EXISTS name VARCHAR(255);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create indexes for trial_subscriptions
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_email ON trial_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_status ON trial_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_trial_end ON trial_subscriptions(trial_end);
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_notification ON trial_subscriptions(status, expiry_notification_sent_at);

-- Drop existing policies for trial_subscriptions first
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own trial subscriptions" ON trial_subscriptions;
  DROP POLICY IF EXISTS "System can insert trial subscriptions" ON trial_subscriptions;
  DROP POLICY IF EXISTS "System can update trial subscriptions" ON trial_subscriptions;
  DROP POLICY IF EXISTS "Admins can view all trial subscriptions" ON trial_subscriptions;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Enable RLS on trial_subscriptions
ALTER TABLE trial_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for trial_subscriptions
DO $$ 
BEGIN
  CREATE POLICY "Users can view their own trial subscriptions" ON trial_subscriptions
    FOR SELECT USING (email = auth.jwt() ->> 'email');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "System can insert trial subscriptions" ON trial_subscriptions
    FOR INSERT WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "System can update trial subscriptions" ON trial_subscriptions
    FOR UPDATE WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON trial_subscriptions TO anon, authenticated;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  plan_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  last_billing_date TIMESTAMP WITH TIME ZONE,
  payment_id VARCHAR(255),
  trial_converted_from UUID REFERENCES trial_subscriptions(id),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_converted ON subscriptions(trial_converted_from);

-- Drop existing policies for subscriptions first
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "System can insert subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "System can update subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions
DO $$ 
BEGIN
  CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (email = auth.jwt() ->> 'email');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "System can insert subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "System can update subscriptions" ON subscriptions
    FOR UPDATE WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Admins can view all subscriptions" ON subscriptions
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON subscriptions TO anon, authenticated;

-- Success message
SELECT 'Trial system with email notification tracking setup completed successfully!' as status;
