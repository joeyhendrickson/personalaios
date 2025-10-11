-- FIX: Check and update subscriptions table structure

-- First, check what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'subscriptions';

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added user_id column to subscriptions table';
    END IF;
END $$;

-- Add other missing columns if they don't exist
DO $$ 
BEGIN
    -- Add email column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN email TEXT NOT NULL DEFAULT 'unknown@example.com';
        RAISE NOTICE 'Added email column';
    END IF;

    -- Add plan_type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'standard';
        RAISE NOTICE 'Added plan_type column';
    END IF;

    -- Add payment_provider column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'payment_provider'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN payment_provider TEXT DEFAULT 'paypal';
        RAISE NOTICE 'Added payment_provider column';
    END IF;

    -- Add payment_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN payment_id TEXT;
        RAISE NOTICE 'Added payment_id column';
    END IF;

    -- Add subscription_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN subscription_id TEXT;
        RAISE NOTICE 'Added subscription_id column';
    END IF;

    -- Add start_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'start_date'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added start_date column';
    END IF;

    -- Add next_billing_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'next_billing_date'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN next_billing_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added next_billing_date column';
    END IF;

    -- Add cancelled_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added cancelled_at column';
    END IF;
END $$;

-- Now add constraints and indexes
DO $$
BEGIN
    -- Add check constraint for plan_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subscriptions_plan_type_check'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD CONSTRAINT subscriptions_plan_type_check 
        CHECK (plan_type IN ('standard', 'premium', 'trial'));
        RAISE NOTICE 'Added plan_type check constraint';
    END IF;

    -- Add check constraint for status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subscriptions_status_check'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD CONSTRAINT subscriptions_status_check 
        CHECK (status IN ('active', 'cancelled', 'past_due', 'expired'));
        RAISE NOTICE 'Added status check constraint';
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON public.subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON public.subscriptions(plan_type);

-- Show final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'subscriptions'
ORDER BY ordinal_position;

SELECT 'Subscriptions table updated successfully!' as status;

