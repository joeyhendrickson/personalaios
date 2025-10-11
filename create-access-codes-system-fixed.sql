-- Access Codes System for Free Account Creation (PayPal Integration) - FIXED VERSION
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

-- Enable RLS (safe to run multiple times)
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can view all access codes" ON access_codes;
DROP POLICY IF EXISTS "Admins can create access codes" ON access_codes;
DROP POLICY IF EXISTS "Admins can update access codes" ON access_codes;
DROP POLICY IF EXISTS "Anyone can view unused active codes for redemption" ON access_codes;

-- Create RLS Policies for access_codes
CREATE POLICY "Admins can view all access codes" ON access_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.email = auth.jwt() ->> 'email'
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can create access codes" ON access_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.email = auth.jwt() ->> 'email'
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can update access codes" ON access_codes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.email = auth.jwt() ->> 'email'
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Anyone can view unused active codes for redemption" ON access_codes
  FOR SELECT USING (
    is_active = true 
    AND used_at IS NULL 
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Create a function to generate random codes (only if it doesn't exist)
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to create access codes (admin only)
CREATE OR REPLACE FUNCTION create_access_code(
  code_name VARCHAR(255),
  code_email VARCHAR(255) DEFAULT NULL,
  expires_days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  new_code VARCHAR(20);
  admin_user_id UUID;
  result JSON;
BEGIN
  -- Check if user is admin
  SELECT au.user_id INTO admin_user_id
  FROM admin_users au
  WHERE au.email = auth.jwt() ->> 'email'
  AND au.is_active = true;
  
  IF admin_user_id IS NULL THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;
  
  -- Generate unique code
  LOOP
    new_code := generate_access_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM access_codes WHERE code = new_code);
  END LOOP;
  
  -- Insert the code
  INSERT INTO access_codes (
    code,
    name,
    email,
    created_by,
    expires_at
  ) VALUES (
    new_code,
    code_name,
    code_email,
    admin_user_id,
    CASE WHEN expires_days > 0 THEN NOW() + (expires_days || ' days')::interval ELSE NULL END
  );
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'code', new_code,
    'expires_at', CASE WHEN expires_days > 0 THEN NOW() + (expires_days || ' days')::interval ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to redeem access codes
CREATE OR REPLACE FUNCTION redeem_access_code(code_to_redeem VARCHAR(20))
RETURNS JSON AS $$
DECLARE
  code_record RECORD;
  result JSON;
BEGIN
  -- Find the code
  SELECT * INTO code_record
  FROM access_codes
  WHERE code = code_to_redeem
  AND is_active = true
  AND used_at IS NULL
  AND (expires_at IS NULL OR expires_at > NOW());
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or expired code');
  END IF;
  
  -- Mark as used
  UPDATE access_codes
  SET used_at = NOW(),
      used_by = auth.uid()
  WHERE id = code_record.id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'code_name', code_record.name,
    'message', 'Access code redeemed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (safe to run multiple times)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON access_codes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_access_code TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_access_code TO anon, authenticated;

-- Create payments table for tracking PayPal payments (if it doesn't exist)
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paypal_order_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  plan_type VARCHAR(20) DEFAULT 'basic', -- 'basic' or 'premium'
  status VARCHAR(20) DEFAULT 'pending',
  payment_details JSONB,
  user_email VARCHAR(255),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing payment policies if they exist
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "System can insert payments" ON payments;

-- Create policies for payments table
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert payments" ON payments
  FOR INSERT WITH CHECK (true);

-- Create trial_subscriptions table
CREATE TABLE IF NOT EXISTS trial_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  plan_type VARCHAR(20) DEFAULT 'basic',
  trial_start TIMESTAMP WITH TIME ZONE NOT NULL,
  trial_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'converted', 'cancelled'
  will_convert_to VARCHAR(20) DEFAULT 'basic',
  conversion_price DECIMAL(10,2) DEFAULT 49.99,
  converted_at TIMESTAMP WITH TIME ZONE,
  payment_id VARCHAR(255),
  final_plan_type VARCHAR(20),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  -- Email notification tracking
  expiry_notification_sent_at TIMESTAMP WITH TIME ZONE,
  expiry_notification_message_id VARCHAR(255),
  expired_notification_sent_at TIMESTAMP WITH TIME ZONE,
  expired_notification_message_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  plan_type VARCHAR(20) NOT NULL, -- 'basic' or 'premium'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'paused', 'past_due'
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

-- Enable RLS on new tables
ALTER TABLE trial_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for trial_subscriptions
CREATE POLICY "Users can view their own trial subscriptions" ON trial_subscriptions
  FOR SELECT USING (email = auth.jwt() ->> 'email');

CREATE POLICY "System can insert trial subscriptions" ON trial_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update trial subscriptions" ON trial_subscriptions
  FOR UPDATE WITH CHECK (true);

-- Create policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (email = auth.jwt() ->> 'email');

CREATE POLICY "System can insert subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update subscriptions" ON subscriptions
  FOR UPDATE WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON trial_subscriptions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON subscriptions TO anon, authenticated;

-- Success message
SELECT 'Access codes system, payments table, trial subscriptions, and subscriptions setup completed successfully!' as status;
