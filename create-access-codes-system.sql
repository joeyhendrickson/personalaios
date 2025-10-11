-- Access Codes System for Free Account Creation (PayPal Integration)
-- Run this in your Supabase SQL editor

-- Create access_codes table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_created_by ON access_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_access_codes_used_by ON access_codes(used_by);
CREATE INDEX IF NOT EXISTS idx_access_codes_active ON access_codes(is_active, expires_at);

-- Enable RLS
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for access_codes
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

-- Create a function to generate random codes
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

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON access_codes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_access_code TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_access_code TO anon, authenticated;
