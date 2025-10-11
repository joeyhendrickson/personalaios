-- PAYMENT GRACE PERIOD SYSTEM
-- When payment fails, user gets 7-day grace period before account is locked

-- Step 1: Add grace period columns to subscriptions table
DO $$
BEGIN
    -- Add payment_failed_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'payment_failed_at'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN payment_failed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added payment_failed_at column';
    END IF;

    -- Add grace_period_end column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'grace_period_end'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN grace_period_end TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added grace_period_end column';
    END IF;

    -- Add last_payment_attempt column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'last_payment_attempt'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN last_payment_attempt TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_payment_attempt column';
    END IF;

    -- Add payment_failure_count column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'payment_failure_count'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN payment_failure_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added payment_failure_count column';
    END IF;

    -- Add last_successful_payment column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'last_successful_payment'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN last_successful_payment TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_successful_payment column';
    END IF;
END $$;

-- Step 2: Update status constraint to include new states
DO $$
BEGIN
    -- Drop old constraint if it exists
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    
    -- Add new constraint with payment_failed and grace_period statuses
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_status_check 
    CHECK (status IN ('active', 'cancelled', 'past_due', 'expired', 'payment_failed', 'grace_period'));
    
    RAISE NOTICE 'Updated status constraint with payment_failed and grace_period';
END $$;

-- Step 3: Create function to handle payment failures
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
    
    -- Log the failure in activity logs
    INSERT INTO public.user_activity_logs (user_id, activity_type, activity_data)
    SELECT 
        user_id,
        'payment_failure',
        jsonb_build_object(
            'subscription_id', p_subscription_id,
            'failure_reason', p_failure_reason,
            'grace_period_end', NOW() + INTERVAL '7 days',
            'failure_count', (SELECT payment_failure_count FROM public.subscriptions WHERE id = p_subscription_id)
        )
    FROM public.subscriptions
    WHERE id = p_subscription_id;
    
    RAISE NOTICE 'Payment failure handled for subscription %', p_subscription_id;
END;
$$;

-- Step 4: Create function to handle successful payments
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
    
    -- Log the success in activity logs
    INSERT INTO public.user_activity_logs (user_id, activity_type, activity_data)
    SELECT 
        user_id,
        'payment_success',
        jsonb_build_object(
            'subscription_id', p_subscription_id,
            'payment_id', p_payment_id,
            'next_billing_date', NOW() + INTERVAL '1 month'
        )
    FROM public.subscriptions
    WHERE id = p_subscription_id;
    
    RAISE NOTICE 'Payment success handled for subscription %', p_subscription_id;
END;
$$;

-- Step 5: Create function to check and lock expired grace periods
CREATE OR REPLACE FUNCTION expire_grace_periods()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update subscriptions where grace period has expired
    WITH updated AS (
        UPDATE public.subscriptions
        SET 
            status = 'expired',
            updated_at = NOW()
        WHERE 
            status = 'grace_period'
            AND grace_period_end <= NOW()
        RETURNING id, user_id
    )
    -- Log the expirations
    INSERT INTO public.user_activity_logs (user_id, activity_type, activity_data)
    SELECT 
        user_id,
        'subscription_expired',
        jsonb_build_object(
            'subscription_id', id,
            'reason', 'grace_period_expired',
            'grace_period_end', NOW()
        )
    FROM updated;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RAISE NOTICE 'Expired % subscription(s) after grace period', expired_count;
END;
$$;

-- Step 6: Create view for subscription status with grace period info
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

-- Grant access to the view
GRANT SELECT ON public.subscription_payment_status TO authenticated;
GRANT SELECT ON public.subscription_payment_status TO anon;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period_end 
ON public.subscriptions(grace_period_end) 
WHERE status = 'grace_period';

CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_failed_at 
ON public.subscriptions(payment_failed_at);

-- Step 8: Add comments for documentation
COMMENT ON COLUMN public.subscriptions.payment_failed_at IS 'When the last payment failure occurred';
COMMENT ON COLUMN public.subscriptions.grace_period_end IS '7 days after payment failure - user loses access after this';
COMMENT ON COLUMN public.subscriptions.payment_failure_count IS 'Number of consecutive payment failures';
COMMENT ON COLUMN public.subscriptions.last_successful_payment IS 'When the last successful payment was received';
COMMENT ON FUNCTION handle_payment_failure IS 'Marks subscription as grace_period and sets 7-day grace period';
COMMENT ON FUNCTION handle_payment_success IS 'Clears payment failures and reactivates subscription';
COMMENT ON FUNCTION expire_grace_periods IS 'Expires subscriptions after 7-day grace period ends';
COMMENT ON VIEW public.subscription_payment_status IS 'Shows subscription status with grace period information';

-- Step 9: Show current subscription statuses
SELECT 
    email,
    name,
    plan_type,
    status,
    payment_status,
    grace_days_remaining,
    payment_failure_count,
    grace_period_end
FROM public.subscription_payment_status
ORDER BY grace_period_end ASC NULLS LAST;

SELECT 'Payment grace period system created successfully!' as status;

