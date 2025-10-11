-- COMPLETE USER SYSTEM SETUP
-- Creates all necessary tables in the correct order

-- Step 1: Create profiles table (must come first as it's referenced by others)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
CREATE POLICY "System can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
    );

-- Step 2: Create trial_subscriptions table
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

ALTER TABLE public.trial_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for trial_subscriptions
DROP POLICY IF EXISTS "Users can view own trial subscription" ON public.trial_subscriptions;
CREATE POLICY "Users can view own trial subscription" ON public.trial_subscriptions
    FOR SELECT USING (
        email IN (SELECT email FROM auth.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "System can insert trial subscriptions" ON public.trial_subscriptions;
CREATE POLICY "System can insert trial subscriptions" ON public.trial_subscriptions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update trial subscriptions" ON public.trial_subscriptions;
CREATE POLICY "System can update trial subscriptions" ON public.trial_subscriptions
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can manage trial subscriptions" ON public.trial_subscriptions;
CREATE POLICY "Admins can manage trial subscriptions" ON public.trial_subscriptions
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
    );

-- Step 3: Create subscriptions table with all columns
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('standard', 'premium', 'trial')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'expired', 'payment_failed', 'grace_period')),
    payment_provider TEXT DEFAULT 'paypal',
    payment_id TEXT,
    subscription_id TEXT,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_billing_date TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    payment_failed_at TIMESTAMP WITH TIME ZONE,
    grace_period_end TIMESTAMP WITH TIME ZONE,
    last_payment_attempt TIMESTAMP WITH TIME ZONE,
    payment_failure_count INTEGER DEFAULT 0,
    last_successful_payment TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;
CREATE POLICY "System can insert subscriptions" ON public.subscriptions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update subscriptions" ON public.subscriptions;
CREATE POLICY "System can update subscriptions" ON public.subscriptions
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
    );

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_email ON public.trial_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_status ON public.trial_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON public.subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON public.subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period_end ON public.subscriptions(grace_period_end) WHERE status = 'grace_period';

-- Step 5: Create user analytics tables
CREATE TABLE IF NOT EXISTS public.user_analytics_summary (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_visits INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0,
    total_tasks_created INTEGER DEFAULT 0,
    total_goals_created INTEGER DEFAULT 0,
    total_tasks_completed INTEGER DEFAULT 0,
    total_goals_completed INTEGER DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE,
    first_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_data JSONB,
    page_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for analytics
DROP POLICY IF EXISTS "Users can view own analytics" ON public.user_analytics_summary;
CREATE POLICY "Users can view own analytics" ON public.user_analytics_summary
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage analytics" ON public.user_analytics_summary;
CREATE POLICY "System can manage analytics" ON public.user_analytics_summary
    FOR ALL WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own logs" ON public.user_activity_logs;
CREATE POLICY "Users can view own logs" ON public.user_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert logs" ON public.user_activity_logs;
CREATE POLICY "System can insert logs" ON public.user_activity_logs
    FOR INSERT WITH CHECK (true);

-- Step 6: Create the consolidated view
CREATE OR REPLACE VIEW public.user_plan_status AS
SELECT 
    p.id as user_id,
    p.name,
    p.email,
    p.created_at,
    CASE 
        -- Check for active paid subscription first (highest priority)
        WHEN s.id IS NOT NULL AND s.status = 'active' THEN s.plan_type
        -- Check for grace period
        WHEN s.id IS NOT NULL AND s.status = 'grace_period' AND s.grace_period_end > NOW() THEN s.plan_type
        -- Check for active trial
        WHEN t.id IS NOT NULL AND t.status = 'active' AND t.trial_end > NOW() THEN 'trial'
        -- Check for expired trial
        WHEN t.id IS NOT NULL AND (t.status = 'expired' OR t.trial_end <= NOW()) THEN 'expired_trial'
        -- No subscription found
        ELSE 'none'
    END as current_plan,
    CASE 
        WHEN s.id IS NOT NULL AND s.status = 'active' THEN 'active'
        WHEN s.id IS NOT NULL AND s.status = 'grace_period' AND s.grace_period_end > NOW() THEN 'payment_failed_grace_period'
        WHEN s.id IS NOT NULL AND s.status = 'grace_period' AND s.grace_period_end <= NOW() THEN 'grace_period_expired'
        WHEN t.id IS NOT NULL AND t.status = 'active' AND t.trial_end > NOW() THEN 'trial_active'
        WHEN t.id IS NOT NULL AND (t.status = 'expired' OR t.trial_end <= NOW()) THEN 'trial_expired'
        ELSE 'no_subscription'
    END as subscription_status,
    t.trial_end as trial_expires_at,
    s.next_billing_date,
    s.payment_provider,
    s.grace_period_end,
    s.payment_failure_count,
    CASE
        WHEN t.id IS NOT NULL AND t.trial_end > NOW() THEN 
            EXTRACT(DAY FROM (t.trial_end - NOW()))
        ELSE NULL
    END as trial_days_remaining,
    CASE
        WHEN s.status = 'grace_period' AND s.grace_period_end > NOW() THEN 
            EXTRACT(DAY FROM (s.grace_period_end - NOW()))
        ELSE NULL
    END as grace_days_remaining
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id AND s.status IN ('active', 'grace_period')
LEFT JOIN public.trial_subscriptions t ON p.email = t.email;

GRANT SELECT ON public.user_plan_status TO authenticated;
GRANT SELECT ON public.user_plan_status TO anon;

-- Step 7: Create subscription payment status view
CREATE OR REPLACE VIEW public.subscription_payment_status AS
SELECT 
    s.id as subscription_id,
    s.user_id,
    p.email,
    p.name,
    s.plan_type,
    s.status,
    s.payment_failed_at,
    s.grace_period_end,
    s.last_payment_attempt,
    s.payment_failure_count,
    s.last_successful_payment,
    s.next_billing_date,
    CASE 
        WHEN s.status = 'grace_period' AND s.grace_period_end > NOW() THEN
            EXTRACT(DAY FROM (s.grace_period_end - NOW()))
        ELSE NULL
    END as grace_days_remaining,
    CASE 
        WHEN s.status = 'active' THEN 'active'
        WHEN s.status = 'grace_period' AND s.grace_period_end > NOW() THEN 'payment_failed_grace_period'
        WHEN s.status = 'grace_period' AND s.grace_period_end <= NOW() THEN 'grace_period_expired'
        WHEN s.status = 'expired' THEN 'expired'
        WHEN s.status = 'cancelled' THEN 'cancelled'
        ELSE s.status
    END as payment_status
FROM public.subscriptions s
JOIN public.profiles p ON s.user_id = p.id;

GRANT SELECT ON public.subscription_payment_status TO authenticated;
GRANT SELECT ON public.subscription_payment_status TO anon;

-- Step 8: Show what we created
SELECT 'All tables and views created successfully!' as status;

-- Show table structures
SELECT 
    'Tables created:' as info,
    table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'trial_subscriptions', 'subscriptions', 'user_analytics_summary', 'user_activity_logs')
ORDER BY table_name;

-- Show current user plan statuses (if any users exist)
SELECT * FROM public.user_plan_status LIMIT 10;

