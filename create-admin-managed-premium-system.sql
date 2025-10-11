-- ADMIN-MANAGED PREMIUM ACCOUNTS SYSTEM
-- Premium accounts are managed directly by admins with manual billing (no PayPal)

-- Step 1: Add admin management columns to subscriptions table
DO $$
BEGIN
    -- Add is_admin_managed column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'is_admin_managed'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN is_admin_managed BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_admin_managed column';
    END IF;

    -- Add admin_notes column for billing notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN admin_notes TEXT;
        RAISE NOTICE 'Added admin_notes column';
    END IF;

    -- Add created_by_admin column (admin_users uses 'id' not 'user_id')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'created_by_admin'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN created_by_admin UUID;
        RAISE NOTICE 'Added created_by_admin column (FK will be added separately)';
    END IF;

    -- Add manually_disabled column (for admin to turn off access)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'manually_disabled'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN manually_disabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added manually_disabled column';
    END IF;

    -- Add disabled_by_admin column (admin_users uses 'id' not 'user_id')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'disabled_by_admin'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN disabled_by_admin UUID;
        RAISE NOTICE 'Added disabled_by_admin column (FK will be added separately)';
    END IF;

    -- Add disabled_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'disabled_at'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN disabled_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added disabled_at column';
    END IF;

    -- Add last_invoice_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'last_invoice_date'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN last_invoice_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_invoice_date column';
    END IF;

    -- Add monthly_rate column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'monthly_rate'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN monthly_rate NUMERIC(10,2);
        RAISE NOTICE 'Added monthly_rate column';
    END IF;
END $$;

-- Step 2: Create function for admins to create premium accounts
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
    -- Verify the admin exists
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_admin_id) THEN
        RAISE EXCEPTION 'Invalid admin user';
    END IF;

    -- Check if user exists in profiles
    SELECT id INTO v_user_id FROM public.profiles WHERE email = p_user_email;
    
    -- If user doesn't exist, they'll need to sign up first
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must create an account first. Email: %', p_user_email;
    END IF;

    -- Create premium subscription (admin-managed)
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
        manually_disabled
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
        false
    )
    RETURNING id INTO v_subscription_id;

    -- Log the creation
    INSERT INTO public.user_activity_logs (user_id, activity_type, activity_data)
    VALUES (
        v_user_id,
        'premium_account_created',
        jsonb_build_object(
            'subscription_id', v_subscription_id,
            'created_by_admin', p_admin_id,
            'monthly_rate', p_monthly_rate,
            'is_admin_managed', true
        )
    );

    RETURN v_subscription_id;
END;
$$;

-- Step 3: Create function for admins to toggle access on/off
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
DECLARE
    v_user_id UUID;
BEGIN
    -- Verify the admin exists
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_admin_id) THEN
        RAISE EXCEPTION 'Invalid admin user';
    END IF;

    -- Update subscription
    UPDATE public.subscriptions
    SET 
        manually_disabled = p_disable,
        disabled_by_admin = CASE WHEN p_disable THEN p_admin_id ELSE NULL END,
        disabled_at = CASE WHEN p_disable THEN NOW() ELSE NULL END,
        status = CASE WHEN p_disable THEN 'cancelled' ELSE 'active' END,
        admin_notes = COALESCE(p_reason, admin_notes),
        updated_at = NOW()
    WHERE id = p_subscription_id
    AND is_admin_managed = true
    RETURNING user_id INTO v_user_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Subscription not found or not admin-managed';
    END IF;

    -- Log the change
    INSERT INTO public.user_activity_logs (user_id, activity_type, activity_data)
    VALUES (
        v_user_id,
        CASE WHEN p_disable THEN 'premium_access_disabled' ELSE 'premium_access_enabled' END,
        jsonb_build_object(
            'subscription_id', p_subscription_id,
            'admin_id', p_admin_id,
            'reason', p_reason,
            'timestamp', NOW()
        )
    );

    RAISE NOTICE 'Premium access % for subscription %', 
        CASE WHEN p_disable THEN 'disabled' ELSE 'enabled' END,
        p_subscription_id;
END;
$$;

-- Step 4: Create function to update invoice tracking
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
    -- Verify the admin exists
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_admin_id) THEN
        RAISE EXCEPTION 'Invalid admin user';
    END IF;

    -- Update subscription with invoice info
    UPDATE public.subscriptions
    SET 
        last_invoice_date = p_invoice_date,
        next_billing_date = p_invoice_date + INTERVAL '1 month',
        admin_notes = COALESCE(
            admin_notes || E'\n[' || p_invoice_date::DATE || '] ' || p_invoice_notes,
            '[' || p_invoice_date::DATE || '] ' || p_invoice_notes
        ),
        updated_at = NOW()
    WHERE id = p_subscription_id
    AND is_admin_managed = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription not found or not admin-managed';
    END IF;

    RAISE NOTICE 'Invoice recorded for subscription %', p_subscription_id;
END;
$$;

-- Step 5: Create view for admin dashboard showing premium accounts
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
    admin_creator.email as created_by_admin_email,
    admin_disabler.email as disabled_by_admin_email,
    EXTRACT(DAY FROM (NOW() - s.start_date))::INTEGER as days_as_member,
    EXTRACT(MONTH FROM AGE(NOW(), s.start_date))::INTEGER as months_as_member,
    -- Check if invoice is overdue (more than 35 days since last invoice)
    CASE 
        WHEN s.last_invoice_date IS NULL THEN false
        WHEN NOW() > (s.last_invoice_date + INTERVAL '35 days') THEN true
        ELSE false
    END as invoice_overdue,
    -- Days since last invoice
    CASE 
        WHEN s.last_invoice_date IS NOT NULL THEN 
            EXTRACT(DAY FROM (NOW() - s.last_invoice_date))::INTEGER
        ELSE NULL
    END as days_since_last_invoice
FROM public.subscriptions s
JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN public.admin_users au_creator ON s.created_by_admin = au_creator.user_id
LEFT JOIN public.profiles admin_creator ON au_creator.user_id = admin_creator.id
LEFT JOIN public.admin_users au_disabler ON s.disabled_by_admin = au_disabler.user_id
LEFT JOIN public.profiles admin_disabler ON au_disabler.user_id = admin_disabler.id
WHERE s.plan_type = 'premium' AND s.is_admin_managed = true
ORDER BY s.start_date DESC;

-- Grant access to admin view
GRANT SELECT ON public.admin_premium_accounts TO authenticated;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_admin_managed 
ON public.subscriptions(is_admin_managed) 
WHERE is_admin_managed = true;

CREATE INDEX IF NOT EXISTS idx_subscriptions_manually_disabled 
ON public.subscriptions(manually_disabled) 
WHERE manually_disabled = true;

-- Step 7: Add comments for documentation
COMMENT ON COLUMN public.subscriptions.is_admin_managed IS 'Premium accounts managed directly by admin (no PayPal)';
COMMENT ON COLUMN public.subscriptions.manually_disabled IS 'Admin has manually disabled this account';
COMMENT ON COLUMN public.subscriptions.monthly_rate IS 'Monthly billing rate for admin-managed accounts';
COMMENT ON COLUMN public.subscriptions.admin_notes IS 'Admin notes about billing, invoices, etc.';
COMMENT ON FUNCTION admin_create_premium_account IS 'Admins use this to create premium accounts with manual billing';
COMMENT ON FUNCTION admin_toggle_premium_access IS 'Admins use this to enable/disable premium account access';
COMMENT ON FUNCTION admin_mark_invoiced IS 'Admins use this to record when an invoice was sent';
COMMENT ON VIEW public.admin_premium_accounts IS 'Admin dashboard view of all premium accounts';

-- Step 8: Show example usage
SELECT 'Admin-managed premium system created!' as status;

-- Show any existing premium accounts
SELECT 
    user_name,
    user_email,
    status,
    monthly_rate,
    joined_date,
    is_disabled,
    months_as_member,
    invoice_overdue
FROM public.admin_premium_accounts
LIMIT 10;

-- Example usage (commented out):
/*
-- To create a premium account (admin must run this):
SELECT admin_create_premium_account(
    '<admin_user_id>', -- Admin's user ID
    'premium@example.com', -- Customer email
    'Premium Customer', -- Customer name
    250.00, -- Monthly rate
    'VIP customer - direct coaching'
);

-- To disable a premium account:
SELECT admin_toggle_premium_access(
    '<admin_user_id>',
    '<subscription_id>',
    true, -- true to disable, false to enable
    'Suspended for non-payment'
);

-- To mark an invoice as sent:
SELECT admin_mark_invoiced(
    '<admin_user_id>',
    '<subscription_id>',
    NOW(),
    'Invoice #2024-001 sent'
);
*/

