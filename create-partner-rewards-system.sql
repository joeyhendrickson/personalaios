-- Create partner rewards system
-- This includes tables for partner rewards and redemptions

-- Partner rewards table
CREATE TABLE IF NOT EXISTS partner_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  point_cost INTEGER NOT NULL CHECK (point_cost > 0),
  partner_name VARCHAR(255) NOT NULL,
  partner_contact_email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partner redemptions table
CREATE TABLE IF NOT EXISTS partner_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_reward_id UUID NOT NULL REFERENCES partner_rewards(id) ON DELETE CASCADE,
  points_redeemed INTEGER NOT NULL CHECK (points_redeemed > 0),
  redemption_code VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'redeemed', 'used', 'expired', 'rejected')),
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_partner_rewards_active ON partner_rewards(is_active);
CREATE INDEX IF NOT EXISTS idx_partner_rewards_partner ON partner_rewards(partner_name);
CREATE INDEX IF NOT EXISTS idx_partner_redemptions_user ON partner_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_redemptions_code ON partner_redemptions(redemption_code);
CREATE INDEX IF NOT EXISTS idx_partner_redemptions_status ON partner_redemptions(status);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_partner_rewards_updated_at 
  BEFORE UPDATE ON partner_rewards 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_redemptions_updated_at 
  BEFORE UPDATE ON partner_redemptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE partner_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_redemptions ENABLE ROW LEVEL SECURITY;

-- Partner rewards policies (readable by all authenticated users)
CREATE POLICY "Partner rewards are viewable by authenticated users" ON partner_rewards
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Partner redemptions policies (users can only see their own redemptions)
CREATE POLICY "Users can view their own partner redemptions" ON partner_redemptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own partner redemptions" ON partner_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies (for managing partner rewards)
CREATE POLICY "Admins can manage partner rewards" ON partner_rewards
  FOR ALL USING (
    auth.uid() = '94a93832-cd8e-47fe-aeae-dbd945557f79'::uuid
  );

CREATE POLICY "Admins can view all partner redemptions" ON partner_redemptions
  FOR SELECT USING (
    auth.uid() = '94a93832-cd8e-47fe-aeae-dbd945557f79'::uuid
  );

CREATE POLICY "Admins can update partner redemptions" ON partner_redemptions
  FOR UPDATE USING (
    auth.uid() = '94a93832-cd8e-47fe-aeae-dbd945557f79'::uuid
  );

-- Insert some sample partner rewards
INSERT INTO partner_rewards (name, description, point_cost, partner_name, partner_contact_email) VALUES
('Amazon Gift Card $25', 'Get a $25 Amazon gift card to spend on anything you want', 2500, 'Amazon', 'partner@amazon.com'),
('Netflix 1 Month Subscription', 'Enjoy one month of Netflix premium streaming', 1500, 'Netflix', 'partner@netflix.com'),
('Spotify Premium 1 Month', 'One month of ad-free music streaming', 1200, 'Spotify', 'partner@spotify.com'),
('Uber Eats $20 Credit', 'Get $20 off your next food delivery order', 2000, 'Uber Eats', 'partner@ubereats.com'),
('Starbucks Gift Card $15', 'Treat yourself to your favorite coffee drinks', 1800, 'Starbucks', 'partner@starbucks.com'),
('Audible 1 Month Credit', 'Get one audiobook credit for your next great listen', 1000, 'Audible', 'partner@audible.com'),
('Apple App Store $10 Credit', 'Download apps, games, or media from the App Store', 1200, 'Apple', 'partner@apple.com'),
('Google Play $10 Credit', 'Get apps, games, movies, and more from Google Play', 1200, 'Google', 'partner@google.com'),
('Target Gift Card $20', 'Shop for anything at Target with this gift card', 2000, 'Target', 'partner@target.com'),
('DoorDash $15 Credit', 'Get $15 off your next food delivery', 1500, 'DoorDash', 'partner@doordash.com');

-- Grant necessary permissions
GRANT SELECT ON partner_rewards TO authenticated;
GRANT SELECT, INSERT ON partner_redemptions TO authenticated;
GRANT ALL ON partner_rewards TO service_role;
GRANT ALL ON partner_redemptions TO service_role;