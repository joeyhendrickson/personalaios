-- FIX SUBSCRIPTIONS TABLE - Add all missing columns
-- Run this FIRST before any other subscription-related SQL

-- Step 1: Check current structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- Step 2: Add all missing columns one by one
DO $$
BEGIN
    -- user_id (CRITICAL - links to auth.users)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN user_id UUID;
        ALTER TABLE public.subscriptions ADD CONSTRAINT fk_subscriptions_user 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column';
    END IF;

    -- email
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'email'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email column';
    END IF;

    -- plan_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN plan_type TEXT DEFAULT 'standard';
        RAISE NOTICE 'Added plan_type column';
    END IF;

    -- payment_provider
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'payment_provider'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN payment_provider TEXT DEFAULT 'paypal';
        RAISE NOTICE 'Added payment_provider column';
    END IF;

    -- payment_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN payment_id TEXT;
        RAISE NOTICE 'Added payment_id column';
    END IF;

    -- subscription_id (PayPal subscription ID)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN subscription_id TEXT;
        RAISE NOTICE 'Added subscription_id column';
    END IF;

    -- start_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added start_date column';
    END IF;

    -- next_billing_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'next_billing_date'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN next_billing_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added next_billing_date column';
    END IF;

    -- cancelled_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added cancelled_at column';
    END IF;

    -- payment_failed_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'payment_failed_at'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN payment_failed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added payment_failed_at column';
    END IF;

    -- grace_period_end
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'grace_period_end'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN grace_period_end TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added grace_period_end column';
    END IF;

    -- last_payment_attempt
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'last_payment_attempt'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN last_payment_attempt TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_payment_attempt column';
    END IF;

    -- payment_failure_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'payment_failure_count'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN payment_failure_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added payment_failure_count column';
    END IF;

    -- last_successful_payment
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'last_successful_payment'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN last_successful_payment TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_successful_payment column';
    END IF;

    -- is_admin_managed (for premium accounts)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'is_admin_managed'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN is_admin_managed BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_admin_managed column';
    END IF;

    -- admin_notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN admin_notes TEXT;
        RAISE NOTICE 'Added admin_notes column';
    END IF;

    -- created_by_admin (references admin_users.id, not user_id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'created_by_admin'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN created_by_admin UUID;
        -- Note: We'll add the foreign key after checking if admin_users exists
        RAISE NOTICE 'Added created_by_admin column';
    END IF;

    -- manually_disabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'manually_disabled'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN manually_disabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added manually_disabled column';
    END IF;

    -- disabled_by_admin (references admin_users.id, not user_id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'disabled_by_admin'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN disabled_by_admin UUID;
        -- Note: We'll add the foreign key after checking if admin_users exists
        RAISE NOTICE 'Added disabled_by_admin column';
    END IF;

    -- disabled_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'disabled_at'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN disabled_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added disabled_at column';
    END IF;

    -- last_invoice_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'last_invoice_date'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN last_invoice_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_invoice_date column';
    END IF;

    -- monthly_rate
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'monthly_rate'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN monthly_rate NUMERIC(10,2);
        RAISE NOTICE 'Added monthly_rate column';
    END IF;

    -- created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;

    -- updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
END $$;

-- Step 3: Add/update constraints
DO $$
BEGIN
    -- Drop old constraint if exists
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    
    -- Add new constraint with all statuses
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_status_check 
    CHECK (status IN ('active', 'cancelled', 'past_due', 'expired', 'payment_failed', 'grace_period'));
    
    -- Drop old plan_type constraint if exists
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
    
    -- Add plan_type constraint
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_plan_type_check 
    CHECK (plan_type IN ('standard', 'premium', 'trial'));
    
    RAISE NOTICE 'Constraints updated';
END $$;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON public.subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON public.subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_admin_managed ON public.subscriptions(is_admin_managed) WHERE is_admin_managed = true;

-- Step 5: Show final structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'subscriptions'
ORDER BY ordinal_position;

SELECT 'Subscriptions table structure fixed!' as status;

