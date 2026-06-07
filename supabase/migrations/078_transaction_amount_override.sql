-- Allow users to override displayed transaction amounts (e.g. fix sign for misclassified Plaid rows)

ALTER TABLE transaction_type_overrides
  ADD COLUMN IF NOT EXISTS amount_override NUMERIC NULL;

ALTER TABLE transaction_type_overrides
  ALTER COLUMN type_override DROP NOT NULL;

ALTER TABLE transaction_type_overrides DROP CONSTRAINT IF EXISTS transaction_type_overrides_has_value;

ALTER TABLE transaction_type_overrides
  ADD CONSTRAINT transaction_type_overrides_has_value CHECK (
    type_override IS NOT NULL OR amount_override IS NOT NULL
  );
