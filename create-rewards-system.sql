-- Create rewards system tables
-- This creates a comprehensive points-based rewards system

-- Table for reward categories
CREATE TABLE IF NOT EXISTS reward_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- Lucide icon name
  color VARCHAR(7), -- Hex color code
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for individual rewards
CREATE TABLE IF NOT EXISTS rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES reward_categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  point_cost INTEGER NOT NULL CHECK (point_cost > 0),
  is_custom BOOLEAN DEFAULT FALSE, -- TRUE for user-created rewards
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for user's personal rewards (both default and custom)
CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE,
  is_custom BOOLEAN DEFAULT FALSE,
  custom_name VARCHAR(200), -- For user-created rewards
  custom_description TEXT, -- For user-created rewards
  custom_point_cost INTEGER, -- For user-created rewards
  is_unlocked BOOLEAN DEFAULT FALSE, -- Can be redeemed
  is_redeemed BOOLEAN DEFAULT FALSE, -- Has been redeemed
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, reward_id)
);

-- Table for point transactions (redemptions)
CREATE TABLE IF NOT EXISTS point_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_reward_id UUID REFERENCES user_rewards(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  points_balance_before INTEGER NOT NULL,
  points_balance_after INTEGER NOT NULL,
  redemption_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT, -- Optional notes about the redemption
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for user milestones (achievement tracking)
CREATE TABLE IF NOT EXISTS user_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_name VARCHAR(200) NOT NULL,
  description TEXT,
  target_points INTEGER NOT NULL CHECK (target_points > 0),
  is_achieved BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMP WITH TIME ZONE,
  reward_unlocked_id UUID REFERENCES rewards(id) ON DELETE SET NULL, -- Optional reward for milestone
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_reward_id ON user_rewards(reward_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_unlocked ON user_rewards(is_unlocked);
CREATE INDEX IF NOT EXISTS idx_point_redemptions_user_id ON point_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_redemptions_date ON point_redemptions(redemption_date);
CREATE INDEX IF NOT EXISTS idx_user_milestones_user_id ON user_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_user_milestones_achieved ON user_milestones(is_achieved);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reward_categories_updated_at BEFORE UPDATE ON reward_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_rewards_updated_at BEFORE UPDATE ON user_rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_milestones_updated_at BEFORE UPDATE ON user_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE reward_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reward_categories (public read)
CREATE POLICY "Anyone can view reward categories" ON reward_categories FOR SELECT USING (true);

-- RLS Policies for rewards (public read)
CREATE POLICY "Anyone can view rewards" ON rewards FOR SELECT USING (true);

-- RLS Policies for user_rewards (user-specific)
CREATE POLICY "Users can view their own rewards" ON user_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own rewards" ON user_rewards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rewards" ON user_rewards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rewards" ON user_rewards FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for point_redemptions (user-specific)
CREATE POLICY "Users can view their own redemptions" ON point_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own redemptions" ON point_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_milestones (user-specific)
CREATE POLICY "Users can view their own milestones" ON user_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own milestones" ON user_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own milestones" ON user_milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own milestones" ON user_milestones FOR DELETE USING (auth.uid() = user_id);

-- Insert default reward categories
INSERT INTO reward_categories (name, description, icon, color) VALUES
('Self-Care', 'Rewards focused on personal well-being and relaxation', 'heart', '#FF6B6B'),
('Learning', 'Educational and skill development rewards', 'book-open', '#4ECDC4'),
('Experiences', 'Memorable experiences and adventures', 'map-pin', '#45B7D1'),
('Health & Fitness', 'Physical health and wellness rewards', 'activity', '#96CEB4'),
('Social', 'Social connections and relationship building', 'users', '#FFEAA7'),
('Creative', 'Creative expression and artistic pursuits', 'palette', '#DDA0DD'),
('Productivity', 'Tools and resources for productivity', 'zap', '#98D8C8'),
('Luxury', 'Special treats and indulgences', 'crown', '#F7DC6F');

-- Insert 30 suggested eudaemonistic rewards
INSERT INTO rewards (category_id, name, description, point_cost) VALUES
-- Self-Care Rewards (5)
((SELECT id FROM reward_categories WHERE name = 'Self-Care'), 'Treat Yourself to Ice Cream', 'Enjoy your favorite ice cream flavor as a sweet reward', 50),
((SELECT id FROM reward_categories WHERE name = 'Self-Care'), 'Spa Day at Home', 'Create a relaxing spa experience with bath salts, face masks, and candles', 200),
((SELECT id FROM reward_categories WHERE name = 'Self-Care'), 'Extra Hour of Sleep', 'Sleep in an extra hour or take a guilt-free nap', 100),
((SELECT id FROM reward_categories WHERE name = 'Self-Care'), 'Massage Appointment', 'Book a professional massage to relax and rejuvenate', 500),
((SELECT id FROM reward_categories WHERE name = 'Self-Care'), 'Rest Day', 'Take a complete day off from all responsibilities and just relax', 300),

-- Learning Rewards (5)
((SELECT id FROM reward_categories WHERE name = 'Learning'), 'Online Course', 'Enroll in a personal development or skill-building course', 400),
((SELECT id FROM reward_categories WHERE name = 'Learning'), 'New Book', 'Buy a book you''ve been wanting to read', 75),
((SELECT id FROM reward_categories WHERE name = 'Learning'), 'Workshop or Seminar', 'Attend a workshop or seminar in your area of interest', 600),
((SELECT id FROM reward_categories WHERE name = 'Learning'), 'Language Learning App Subscription', 'Get a premium subscription to a language learning app', 150),
((SELECT id FROM reward_categories WHERE name = 'Learning'), 'Professional Development Book', 'Purchase a book focused on career or personal growth', 100),

-- Experience Rewards (5)
((SELECT id FROM reward_categories WHERE name = 'Experiences'), 'Weekend Getaway', 'Plan a short weekend trip to a nearby destination', 800),
((SELECT id FROM reward_categories WHERE name = 'Experiences'), 'Concert or Show Tickets', 'Buy tickets to see your favorite artist or show', 300),
((SELECT id FROM reward_categories WHERE name = 'Experiences'), 'Museum Visit', 'Spend a day exploring a museum or cultural site', 120),
((SELECT id FROM reward_categories WHERE name = 'Experiences'), 'Outdoor Adventure', 'Go hiking, camping, or try a new outdoor activity', 250),
((SELECT id FROM reward_categories WHERE name = 'Experiences'), 'Cooking Class', 'Take a cooking class to learn new culinary skills', 350),

-- Health & Fitness Rewards (5)
((SELECT id FROM reward_categories WHERE name = 'Health & Fitness'), 'New Workout Gear', 'Buy new athletic wear or fitness equipment', 200),
((SELECT id FROM reward_categories WHERE name = 'Health & Fitness'), 'Personal Training Session', 'Book a session with a personal trainer', 400),
((SELECT id FROM reward_categories WHERE name = 'Health & Fitness'), 'Healthy Meal Delivery', 'Order a week of healthy meal delivery service', 300),
((SELECT id FROM reward_categories WHERE name = 'Health & Fitness'), 'Yoga or Pilates Class', 'Attend a yoga or Pilates class', 150),

-- Social Rewards (3)
((SELECT id FROM reward_categories WHERE name = 'Social'), 'Nice Meal Out', 'Treat yourself to a nice dinner at a restaurant you''ve been wanting to try', 250),
((SELECT id FROM reward_categories WHERE name = 'Social'), 'Coffee with a Friend', 'Meet up with a friend for coffee and catch up', 50),
((SELECT id FROM reward_categories WHERE name = 'Social'), 'Host a Dinner Party', 'Invite friends over for a home-cooked meal', 200),

-- Creative Rewards (3)
((SELECT id FROM reward_categories WHERE name = 'Creative'), 'Art Supplies', 'Buy new art supplies for your creative projects', 150),
((SELECT id FROM reward_categories WHERE name = 'Creative'), 'Music Lessons', 'Take a lesson in an instrument you''ve always wanted to learn', 300),
((SELECT id FROM reward_categories WHERE name = 'Creative'), 'Photography Workshop', 'Attend a photography workshop to improve your skills', 400),

-- Productivity Rewards (2)
((SELECT id FROM reward_categories WHERE name = 'Productivity'), 'Productivity App Premium', 'Get premium access to a productivity or organization app', 100),
((SELECT id FROM reward_categories WHERE name = 'Productivity'), 'New Office Supplies', 'Buy new notebooks, pens, or other office supplies', 75),

-- Luxury Rewards (2)
((SELECT id FROM reward_categories WHERE name = 'Luxury'), 'Amazon Wishlist Item', 'Choose one item from your Amazon wishlist to purchase', 200),
((SELECT id FROM reward_categories WHERE name = 'Luxury'), 'Premium Subscription', 'Get a premium subscription to a service you enjoy (Netflix, Spotify, etc.)', 150);

-- Insert default milestones
INSERT INTO user_milestones (user_id, milestone_name, description, target_points, reward_unlocked_id) 
SELECT 
  auth.uid(),
  'First Steps',
  'Earn your first 100 points',
  100,
  (SELECT id FROM rewards WHERE name = 'Treat Yourself to Ice Cream' LIMIT 1)
WHERE auth.uid() IS NOT NULL;

INSERT INTO user_milestones (user_id, milestone_name, description, target_points, reward_unlocked_id) 
SELECT 
  auth.uid(),
  'Building Momentum',
  'Accumulate 500 points',
  500,
  (SELECT id FROM rewards WHERE name = 'New Book' LIMIT 1)
WHERE auth.uid() IS NOT NULL;

INSERT INTO user_milestones (user_id, milestone_name, description, target_points, reward_unlocked_id) 
SELECT 
  auth.uid(),
  'Consistent Progress',
  'Reach 1,000 points',
  1000,
  (SELECT id FROM rewards WHERE name = 'Spa Day at Home' LIMIT 1)
WHERE auth.uid() IS NOT NULL;

INSERT INTO user_milestones (user_id, milestone_name, description, target_points, reward_unlocked_id) 
SELECT 
  auth.uid(),
  'Dedicated Achiever',
  'Accumulate 2,500 points',
  2500,
  (SELECT id FROM rewards WHERE name = 'Weekend Getaway' LIMIT 1)
WHERE auth.uid() IS NOT NULL;

INSERT INTO user_milestones (user_id, milestone_name, description, target_points, reward_unlocked_id) 
SELECT 
  auth.uid(),
  'Life Master',
  'Reach 5,000 points',
  5000,
  (SELECT id FROM rewards WHERE name = 'Massage Appointment' LIMIT 1)
WHERE auth.uid() IS NOT NULL;
