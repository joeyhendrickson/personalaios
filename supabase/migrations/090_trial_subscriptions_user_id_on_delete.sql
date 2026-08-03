-- Allow auth user deletion when a trial_subscriptions row references user_id.
-- Without ON DELETE SET NULL, Supabase Auth dashboard delete fails with:
-- trial_subscriptions_user_id_fkey (SQLSTATE 23503)

ALTER TABLE public.trial_subscriptions
  DROP CONSTRAINT IF EXISTS trial_subscriptions_user_id_fkey;

ALTER TABLE public.trial_subscriptions
  ADD CONSTRAINT trial_subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
