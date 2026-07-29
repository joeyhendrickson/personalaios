-- Workshop registrations for Lifestacks coaching workshop payments

CREATE TABLE IF NOT EXISTS workshop_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  paypal_order_id VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  on_site_stay BOOLEAN NOT NULL DEFAULT false,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'completed',
  registration_status VARCHAR(50) NOT NULL DEFAULT 'registered'
    CHECK (registration_status IN ('registered', 'id_pending', 'confirmed', 'cancelled')),
  id_verified BOOLEAN NOT NULL DEFAULT false,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  payment_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshop_registrations_email ON workshop_registrations(email);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_created_at ON workshop_registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_paypal_order_id ON workshop_registrations(paypal_order_id);

ALTER TABLE workshop_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert workshop registrations" ON workshop_registrations;
DROP POLICY IF EXISTS "Admins can view workshop registrations" ON workshop_registrations;
DROP POLICY IF EXISTS "Admins can update workshop registrations" ON workshop_registrations;

CREATE POLICY "System can insert workshop registrations" ON workshop_registrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view workshop registrations" ON workshop_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

CREATE POLICY "Admins can update workshop registrations" ON workshop_registrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE ON workshop_registrations TO anon, authenticated;

-- Backfill from existing workshop payments if any were recorded before this table existed
INSERT INTO workshop_registrations (
  payment_id,
  paypal_order_id,
  full_name,
  email,
  phone,
  on_site_stay,
  amount,
  currency,
  payment_status,
  registration_status,
  id_verified,
  terms_accepted,
  payment_details,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.paypal_order_id,
  COALESCE(p.payment_details->'registration'->>'name', 'Workshop registrant'),
  COALESCE(p.user_email, p.payment_details->'registration'->>'email', 'unknown@example.com'),
  NULLIF(p.payment_details->'registration'->>'phone', ''),
  COALESCE((p.payment_details->'registration'->>'onSiteStay')::boolean, false),
  p.amount,
  COALESCE(p.currency, 'USD'),
  COALESCE(p.status, 'completed'),
  'id_pending',
  false,
  COALESCE((p.payment_details->'registration'->>'acceptedTerms')::boolean, false),
  p.payment_details,
  p.created_at,
  p.updated_at
FROM payments p
WHERE p.plan_type = 'workshop'
ON CONFLICT (paypal_order_id) DO NOTHING;
