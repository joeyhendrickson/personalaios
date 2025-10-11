-- ========================================================================
-- COMPLETE USER SYSTEM SETUP - RUN THIS ENTIRE FILE IN ONE GO
-- ========================================================================
-- This creates all tables, views, and functions needed for:
-- - Trial accounts (7-day free)
-- - Standard accounts (PayPal billing with 7-day grace period)
-- - Premium accounts (Admin-managed with manual invoicing)
-- ========================================================================

-- STEP 1: Drop the problematic trigger first
DROP TRIGGER IF EXISTS trigger_create_user_analytics ON auth.users;

-- STEP 2: Create profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
CREATE POLICY "System can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- STEP 3: Create trial_subscriptions table
CREATE TABLE IF NOT EXISTS public.trial_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    plan_type TEXT NOT NULL DEFAULT 'basic',
    trial_start TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    trial_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
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

DROP POLICY IF EXISTS "System can insert trial subscriptions" ON public.trial_subscriptions;
CREATE POLICY "System can insert trial subscriptions" ON public.trial_subscriptions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update trial subscriptions" ON public.trial_subscriptions;
CREATE POLICY "System can update trial subscriptions" ON public.trial_subscriptions
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can view own trial" ON public.trial_subscriptions;
CREATE POLICY "Users can view own trial" ON public.trial_subscriptions
    FOR SELECT USING (email IN (SELECT email FROM auth.users WHERE id = auth.uid()));

-- STEP 4: Add columns to subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_type TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_payment_attempt TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_failure_count INTEGER;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_successful_payment TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_admin_managed BOOLEAN;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS created_by_admin UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS manually_disabled BOOLEAN;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS disabled_by_admin UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_invoice_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS monthly_rate NUMERIC(10,2);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Set defaults for existing rows
UPDATE public.subscriptions SET payment_failure_count = 0 WHERE payment_failure_count IS NULL;
UPDATE public.subscriptions SET is_admin_managed = false WHERE is_admin_managed IS NULL;
UPDATE public.subscriptions SET manually_disabled = false WHERE manually_disabled IS NULL;
UPDATE public.subscriptions SET created_at = NOW() WHERE created_at IS NULL;
UPDATE public.subscriptions SET updated_at = NOW() WHERE updated_at IS NULL;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage subscriptions" ON public.subscriptions;
CREATE POLICY "System can manage subscriptions" ON public.subscriptions
    FOR ALL WITH CHECK (true);

-- STEP 5: Create user analytics tables
CREATE TABLE IF NOT EXISTS public.user_analytics_summary (
    user_id UUID PRIMARY KEY,
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
    user_id UUID,
    activity_type TEXT NOT NULL,
    activity_data JSONB,
    page_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

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

-- STEP 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_email ON public.trial_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_trial_subscriptions_status ON public.trial_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON public.subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON public.subscriptions(plan_type);

-- STEP 7: Create helper functions

-- Function to expire old trials
CREATE OR REPLACE FUNCTION expire_old_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.trial_subscriptions
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE 
        status = 'active'
        AND trial_end <= NOW();
END;
$$;

-- Function to handle payment failures (7-day grace period)
CREATE OR REPLACE FUNCTION handle_payment_failure(
    p_subscription_id UUID,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.subscriptions
    SET 
        status = 'grace_period',
        payment_failed_at = NOW(),
        grace_period_end = NOW() + INTERVAL '7 days',
        last_payment_attempt = NOW(),
        payment_failure_count = COALESCE(payment_failure_count, 0) + 1,
        updated_at = NOW()
    WHERE id = p_subscription_id;
END;
$$;

-- Function to handle successful payments
CREATE OR REPLACE FUNCTION handle_payment_success(
    p_subscription_id UUID,
    p_payment_id TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.subscriptions
    SET 
        status = 'active',
        payment_failed_at = NULL,
        grace_period_end = NULL,
        last_payment_attempt = NOW(),
        last_successful_payment = NOW(),
        payment_failure_count = 0,
        payment_id = p_payment_id,
        next_billing_date = NOW() + INTERVAL '1 month',
        updated_at = NOW()
    WHERE id = p_subscription_id;
END;
$$;

-- Function to expire grace periods
CREATE OR REPLACE FUNCTION expire_grace_periods()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.subscriptions
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE 
        status = 'grace_period'
        AND grace_period_end <= NOW();
END;
$$;

-- Function for admins to create premium accounts
CREATE OR REPLACE FUNCTION admin_create_premium_account(
    p_admin_id UUID,
    p_user_email TEXT,
    p_user_name TEXT,
    p_monthly_rate NUMERIC DEFAULT 250.00,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_subscription_id UUID;
BEGIN
    -- Get user_id from profiles
    SELECT id INTO v_user_id FROM public.profiles WHERE email = p_user_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must create an account first. Email: %', p_user_email;
    END IF;

    -- Create premium subscription
    INSERT INTO public.subscriptions (
        user_id,
        email,
        plan_type,
        status,
        payment_provider,
        is_admin_managed,
        created_by_admin,
        monthly_rate,
        admin_notes,
        start_date,
        next_billing_date,
        manually_disabled,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        p_user_email,
        'premium',
        'active',
        'admin_managed',
        true,
        p_admin_id,
        p_monthly_rate,
        p_notes,
        NOW(),
        NOW() + INTERVAL '1 month',
        false,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_subscription_id;

    RETURN v_subscription_id;
END;
$$;

-- Function for admins to toggle access
CREATE OR REPLACE FUNCTION admin_toggle_premium_access(
    p_admin_id UUID,
    p_subscription_id UUID,
    p_disable BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.subscriptions
    SET 
        manually_disabled = p_disable,
        disabled_by_admin = CASE WHEN p_disable THEN p_admin_id ELSE NULL END,
        disabled_at = CASE WHEN p_disable THEN NOW() ELSE NULL END,
        status = CASE WHEN p_disable THEN 'cancelled' ELSE 'active' END,
        admin_notes = COALESCE(p_reason, admin_notes),
        updated_at = NOW()
    WHERE id = p_subscription_id
    AND is_admin_managed = true;
END;
$$;

-- Function to mark invoice sent
CREATE OR REPLACE FUNCTION admin_mark_invoiced(
    p_admin_id UUID,
    p_subscription_id UUID,
    p_invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_invoice_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.subscriptions
    SET 
        last_invoice_date = p_invoice_date,
        next_billing_date = p_invoice_date + INTERVAL '1 month',
        updated_at = NOW()
    WHERE id = p_subscription_id
    AND is_admin_managed = true;
END;
$$;

-- STEP 8: Create user_plan_status view
CREATE OR REPLACE VIEW public.user_plan_status AS
SELECT 
    p.id as user_id,
    p.name,
    p.email,
    p.created_at,
    CASE 
        WHEN s.id IS NOT NULL AND s.status = 'active' THEN s.plan_type
        WHEN s.id IS NOT NULL AND s.status = 'grace_period' AND s.grace_period_end > NOW() THEN s.plan_type
        WHEN t.id IS NOT NULL AND t.status = 'active' AND t.trial_end > NOW() THEN 'trial'
        WHEN t.id IS NOT NULL AND (t.status = 'expired' OR t.trial_end <= NOW()) THEN 'expired_trial'
        ELSE 'none'
    END as current_plan,
    CASE 
        WHEN s.id IS NOT NULL AND s.status = 'active' THEN 'active'
        WHEN s.id IS NOT NULL AND s.status = 'grace_period' AND s.grace_period_end > NOW() THEN 'grace_period'
        WHEN s.id IS NOT NULL AND s.status = 'grace_period' AND s.grace_period_end <= NOW() THEN 'grace_expired'
        WHEN t.id IS NOT NULL AND t.status = 'active' AND t.trial_end > NOW() THEN 'trial_active'
        WHEN t.id IS NOT NULL AND (t.status = 'expired' OR t.trial_end <= NOW()) THEN 'trial_expired'
        ELSE 'no_subscription'
    END as subscription_status,
    s.is_admin_managed,
    s.manually_disabled,
    t.trial_end as trial_expires_at,
    s.next_billing_date,
    s.grace_period_end,
    CASE
        WHEN t.id IS NOT NULL AND t.trial_end > NOW() THEN 
            EXTRACT(DAY FROM (t.trial_end - NOW()))::INTEGER
        ELSE NULL
    END as trial_days_remaining,
    CASE
        WHEN s.status = 'grace_period' AND s.grace_period_end > NOW() THEN 
            EXTRACT(DAY FROM (s.grace_period_end - NOW()))::INTEGER
        ELSE NULL
    END as grace_days_remaining
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id AND s.status IN ('active', 'grace_period')
LEFT JOIN public.trial_subscriptions t ON p.email = t.email;

GRANT SELECT ON public.user_plan_status TO authenticated;
GRANT SELECT ON public.user_plan_status TO anon;

-- STEP 9: Create admin premium accounts view
CREATE OR REPLACE VIEW public.admin_premium_accounts AS
SELECT 
    s.id as subscription_id,
    s.user_id,
    p.name as user_name,
    p.email as user_email,
    s.status,
    s.monthly_rate,
    s.start_date as joined_date,
    s.last_invoice_date,
    s.next_billing_date,
    s.manually_disabled as is_disabled,
    s.disabled_at,
    s.admin_notes,
    EXTRACT(DAY FROM (NOW() - s.start_date))::INTEGER as days_as_member,
    EXTRACT(MONTH FROM AGE(NOW(), s.start_date))::INTEGER as months_as_member,
    CASE 
        WHEN s.last_invoice_date IS NULL THEN false
        WHEN NOW() > (s.last_invoice_date + INTERVAL '35 days') THEN true
        ELSE false
    END as invoice_overdue,
    CASE 
        WHEN s.last_invoice_date IS NOT NULL THEN 
            EXTRACT(DAY FROM (NOW() - s.last_invoice_date))::INTEGER
        ELSE NULL
    END as days_since_last_invoice
FROM public.subscriptions s
JOIN public.profiles p ON s.user_id = p.id
WHERE s.plan_type = 'premium' AND s.is_admin_managed = true
ORDER BY s.start_date DESC;

GRANT SELECT ON public.admin_premium_accounts TO authenticated;

-- STEP 10: SECURITY CONSTRAINTS - Prevent admin users from having trial subscriptions
-- Create a function to check if an email is an admin user
CREATE OR REPLACE FUNCTION public.is_admin_user(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = check_email AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a constraint to prevent admin users from having trial subscriptions
ALTER TABLE public.trial_subscriptions 
ADD CONSTRAINT no_admin_trials 
CHECK (NOT public.is_admin_user(email));

-- STEP 11: Final checks and summary
SELECT 
    'SETUP COMPLETE!' as status,
    COUNT(DISTINCT p.id) as total_users,
    COUNT(DISTINCT CASE WHEN t.status = 'active' AND t.trial_end > NOW() THEN t.email END) as active_trials,
    COUNT(DISTINCT CASE WHEN s.status = 'active' AND s.plan_type = 'standard' THEN s.user_id END) as standard_users,
    COUNT(DISTINCT CASE WHEN s.status = 'active' AND s.plan_type = 'premium' THEN s.user_id END) as premium_users
FROM public.profiles p
LEFT JOIN public.trial_subscriptions t ON p.email = t.email
LEFT JOIN public.subscriptions s ON p.id = s.user_id;

-- Show user plan statuses
SELECT * FROM public.user_plan_status LIMIT 10;

