-- SIMPLE FIX for subscriptions table - Add columns without complex logic

-- Add user_id column
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add foreign key constraint for user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_subscriptions_user'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD CONSTRAINT fk_subscriptions_user 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add all other columns
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'standard';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'paypal';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_payment_attempt TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_failure_count INTEGER DEFAULT 0;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_successful_payment TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_admin_managed BOOLEAN DEFAULT false;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS created_by_admin UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS manually_disabled BOOLEAN DEFAULT false;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS disabled_by_admin UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_invoice_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS monthly_rate NUMERIC(10,2);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status constraint
DO $$
BEGIN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_status_check 
    CHECK (status IN ('active', 'cancelled', 'past_due', 'expired', 'payment_failed', 'grace_period'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Status constraint already exists or cannot be added';
END $$;

-- Update plan_type constraint
DO $$
BEGIN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_plan_type_check 
    CHECK (plan_type IN ('standard', 'premium', 'trial'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Plan type constraint already exists or cannot be added';
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON public.subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON public.subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_admin_managed ON public.subscriptions(is_admin_managed);

-- Show final structure
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'subscriptions'
ORDER BY ordinal_position;

SELECT 'Subscriptions table columns added!' as status;

