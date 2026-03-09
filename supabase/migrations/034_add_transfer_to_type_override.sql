-- Add 'transfer' option to transaction_type_overrides
-- Run this in Supabase SQL Editor if transfer (grey/neutral) gives 500 error

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'transaction_type_overrides'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type_override%'
  LOOP
    EXECUTE format('ALTER TABLE transaction_type_overrides DROP CONSTRAINT %I', r.conname);
  END LOOP;
END
$$;

ALTER TABLE transaction_type_overrides
  ADD CONSTRAINT transaction_type_overrides_type_override_check
  CHECK (type_override IN ('income', 'expense', 'transfer'));
