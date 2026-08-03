-- Personalized Lifestacks AI setup + 1:1 coach session ($49)

CREATE TABLE IF NOT EXISTS coach_setup_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  paypal_order_id VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  focus_notes TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'completed',
  booking_status VARCHAR(50) NOT NULL DEFAULT 'paid'
    CHECK (booking_status IN ('paid', 'scheduled', 'completed', 'cancelled')),
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  payment_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_setup_bookings_email ON coach_setup_bookings(email);
CREATE INDEX IF NOT EXISTS idx_coach_setup_bookings_user_id ON coach_setup_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_setup_bookings_created_at ON coach_setup_bookings(created_at DESC);

ALTER TABLE coach_setup_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert coach setup bookings" ON coach_setup_bookings;
DROP POLICY IF EXISTS "Users can view own coach setup bookings" ON coach_setup_bookings;
DROP POLICY IF EXISTS "Admins can view coach setup bookings" ON coach_setup_bookings;
DROP POLICY IF EXISTS "Admins can update coach setup bookings" ON coach_setup_bookings;

CREATE POLICY "System can insert coach setup bookings" ON coach_setup_bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own coach setup bookings" ON coach_setup_bookings
  FOR SELECT USING (
    auth.uid() = user_id
    OR email = auth.jwt() ->> 'email'
  );

CREATE POLICY "Admins can view coach setup bookings" ON coach_setup_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

CREATE POLICY "Admins can update coach setup bookings" ON coach_setup_bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE ON coach_setup_bookings TO anon, authenticated;
