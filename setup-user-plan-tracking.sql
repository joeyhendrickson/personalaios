-- COMPREHENSIVE USER PLAN TRACKING SETUP
-- This ensures all users (new and existing) are properly categorized by plan type

-- Step 1: Ensure trial_subscriptions table exists (should already exist)
CREATE TABLE IF NOT EXISTS public.trial_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  plan_type TEXT NOT NULL DEFAULT 'basic',
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  trial_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'expired', 'converted', 'cancelled')),
  will_convert_to TEXT,
  conversion_price NUMERIC,
  converted_at TIMESTAMP WITH TIME ZONE,
  payment_id TEXT,
  final_plan_type TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expiry_notification_sent_at TIMESTAMP WITH TIME ZONE,
  expiry_notification_message_id TEXT,
  expired_notification_sent_at TIMESTAMP WITH TIME ZONE,
  expired_notification_message_id TEXT
);

-- Step 2: Ensure subscriptions table exists for paid plans
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('standard', 'premium', 'trial')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')),
  payment_provider TEXT DEFAULT 'paypal',
  payment_id TEXT,
  subscription_id TEXT,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_billing_date TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_type, status)
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_email ON public.trial_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_status ON public.trial_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON public.subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON public.subscriptions(plan_type);

-- Step 4: Enable RLS
ALTER TABLE public.trial_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for trial_subscriptions
DROP POLICY IF EXISTS "Users can view own trial subscription" ON public.trial_subscriptions;
CREATE POLICY "Users can view own trial subscription" 
ON public.trial_subscriptions 
FOR SELECT 
USING (
  email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all trial subscriptions" ON public.trial_subscriptions;
CREATE POLICY "Admins can view all trial subscriptions" 
ON public.trial_subscriptions 
FOR ALL 
USING (
  auth.uid() IN (SELECT user_id FROM public.admin_users)
);

DROP POLICY IF EXISTS "System can insert trial subscriptions" ON public.trial_subscriptions;
CREATE POLICY "System can insert trial subscriptions" 
ON public.trial_subscriptions 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "System can update trial subscriptions" ON public.trial_subscriptions;
CREATE POLICY "System can update trial subscriptions" 
ON public.trial_subscriptions 
FOR UPDATE 
USING (true);

-- Step 6: Create RLS policies for subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" 
ON public.subscriptions 
FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (
  auth.uid() IN (SELECT user_id FROM public.admin_users)
);

DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;
CREATE POLICY "System can insert subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "System can update subscriptions" ON public.subscriptions;
CREATE POLICY "System can update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (true);

-- Step 7: Create a view that shows ALL users with their current plan type
CREATE OR REPLACE VIEW public.user_plan_status AS
SELECT 
  p.id as user_id,
  p.name,
  p.email,
  p.created_at,
  CASE 
    -- Check for active paid subscription first (highest priority)
    WHEN s.id IS NOT NULL AND s.status = 'active' THEN s.plan_type
    -- Check for active trial
    WHEN t.id IS NOT NULL AND t.status = 'active' AND t.trial_end > NOW() THEN 'trial'
    -- Check for expired trial
    WHEN t.id IS NOT NULL AND (t.status = 'expired' OR t.trial_end <= NOW()) THEN 'expired_trial'
    -- No subscription found
    ELSE 'none'
  END as current_plan,
  CASE 
    WHEN s.id IS NOT NULL AND s.status = 'active' THEN 'active'
    WHEN t.id IS NOT NULL AND t.status = 'active' AND t.trial_end > NOW() THEN 'trial_active'
    WHEN t.id IS NOT NULL AND (t.status = 'expired' OR t.trial_end <= NOW()) THEN 'trial_expired'
    ELSE 'no_subscription'
  END as subscription_status,
  t.trial_end as trial_expires_at,
  s.next_billing_date,
  s.payment_provider,
  CASE
    WHEN t.id IS NOT NULL AND t.trial_end > NOW() THEN 
      EXTRACT(DAY FROM (t.trial_end - NOW()))
    ELSE NULL
  END as trial_days_remaining
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id AND s.status = 'active'
LEFT JOIN public.trial_subscriptions t ON p.email = t.email;

-- Step 8: Grant access to the view
GRANT SELECT ON public.user_plan_status TO authenticated;
GRANT SELECT ON public.user_plan_status TO anon;

-- Step 9: Create a function to get user's current plan
CREATE OR REPLACE FUNCTION get_user_plan(user_email TEXT)
RETURNS TABLE (
  plan_type TEXT,
  status TEXT,
  days_remaining INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    current_plan::TEXT,
    subscription_status::TEXT,
    CAST(trial_days_remaining AS INTEGER)
  FROM public.user_plan_status
  WHERE email = user_email
  LIMIT 1;
END;
$$;

-- Step 10: Add comments for documentation
COMMENT ON TABLE public.trial_subscriptions IS 'Tracks users on 7-day free trials';
COMMENT ON TABLE public.subscriptions IS 'Tracks users with paid subscriptions (standard/premium)';
COMMENT ON VIEW public.user_plan_status IS 'Consolidated view of all users and their current plan status';
COMMENT ON FUNCTION get_user_plan IS 'Get a user''s current plan type by email';

-- Step 11: Show current setup status
SELECT 
  'Setup complete!' as status,
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT CASE WHEN t.status = 'active' THEN t.email END) as active_trials,
  COUNT(DISTINCT CASE WHEN s.status = 'active' AND s.plan_type = 'standard' THEN s.user_id END) as standard_users,
  COUNT(DISTINCT CASE WHEN s.status = 'active' AND s.plan_type = 'premium' THEN s.user_id END) as premium_users
FROM public.profiles p
LEFT JOIN public.trial_subscriptions t ON p.email = t.email
LEFT JOIN public.subscriptions s ON p.id = s.user_id;

-- Show sample of user plan status
SELECT * FROM public.user_plan_status LIMIT 10;

