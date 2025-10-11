-- TRIAL EXPIRY HANDLING
-- This creates a cron job that automatically marks expired trials

-- Step 1: Create function to expire old trials
CREATE OR REPLACE FUNCTION expire_old_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update trials that have passed their expiry date
  UPDATE public.trial_subscriptions
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    status = 'active'
    AND trial_end <= NOW();
    
  RAISE NOTICE 'Expired % trial(s)', (SELECT COUNT(*) FROM public.trial_subscriptions WHERE status = 'expired' AND trial_end <= NOW());
END;
$$;

-- Step 2: Create a cron job to run daily at midnight (if pg_cron is available)
-- Note: This requires pg_cron extension which may not be enabled in all Supabase instances
-- If pg_cron is not available, the expiry will be checked in the middleware

-- Try to create the cron job (will fail gracefully if pg_cron is not installed)
DO $$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule the job to run daily at midnight
    PERFORM cron.schedule(
      'expire-old-trials',
      '0 0 * * *', -- Every day at midnight
      'SELECT expire_old_trials();'
    );
    RAISE NOTICE 'Cron job created successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Trial expiry will be handled by application logic.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create cron job: %. Trial expiry will be handled by application logic.', SQLERRM;
END $$;

-- Step 3: Manually expire any trials that are already past their expiry date
SELECT expire_old_trials();

-- Step 4: Show expired trials
SELECT 
  email,
  name,
  trial_start,
  trial_end,
  status,
  EXTRACT(DAY FROM (NOW() - trial_end)) as days_since_expiry
FROM public.trial_subscriptions
WHERE status = 'expired'
ORDER BY trial_end DESC;

COMMENT ON FUNCTION expire_old_trials IS 'Automatically marks expired trial subscriptions';

