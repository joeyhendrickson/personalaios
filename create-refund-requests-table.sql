-- Create refund_requests table for admin approval workflow
CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  paypal_subscription_id TEXT NOT NULL,
  email TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 20.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  request_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  refund_id TEXT,
  hours_since_creation DECIMAL(10,2)
);

-- Add RLS policies
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own refund requests
CREATE POLICY "Users can view own refund requests" ON refund_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for admins to manage all refund requests
CREATE POLICY "Admins can manage all refund requests" ON refund_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.email = auth.jwt() ->> 'email' 
      AND admin_users.is_active = true
    )
  );

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON refund_requests(created_at);
