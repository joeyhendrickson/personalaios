-- Platform billing: track costs from Plaid, OpenAI, and other service providers
-- Populated via screenshot uploads parsed by AI vision

CREATE TABLE IF NOT EXISTS platform_billing_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,                     -- 'plaid', 'openai', 'vercel', etc.
  charge_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_period TEXT,                        -- e.g. 'May 2026', '2026-04-01 to 2026-04-30'
  source_type TEXT NOT NULL DEFAULT 'screenshot', -- 'screenshot' or 'manual'
  screenshot_url TEXT,                        -- Supabase storage path for the uploaded image
  raw_parsed_data JSONB,                      -- full AI-parsed output for audit
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_billing_provider
  ON platform_billing_entries(provider, charge_date DESC);

CREATE INDEX IF NOT EXISTS idx_platform_billing_date
  ON platform_billing_entries(charge_date DESC);

-- No RLS needed: admin-only table accessed via service role or admin checks in API
-- But enable it with a permissive policy for safety
ALTER TABLE platform_billing_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to platform billing"
  ON platform_billing_entries
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_platform_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_platform_billing_updated_at ON platform_billing_entries;
CREATE TRIGGER trg_platform_billing_updated_at
  BEFORE UPDATE ON platform_billing_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_billing_updated_at();
