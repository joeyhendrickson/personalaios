-- Create app ratings table
CREATE TABLE IF NOT EXISTS app_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_id VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_ratings_user_id ON app_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_app_ratings_module_id ON app_ratings(module_id);
CREATE INDEX IF NOT EXISTS idx_app_ratings_rating ON app_ratings(rating);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_app_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_app_ratings_updated_at ON app_ratings;
CREATE TRIGGER trigger_update_app_ratings_updated_at
  BEFORE UPDATE ON app_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_ratings_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE app_ratings ENABLE ROW LEVEL SECURITY;

-- Users can view all ratings (for display purposes)
DROP POLICY IF EXISTS "Users can view all app ratings" ON app_ratings;
CREATE POLICY "Users can view all app ratings" ON app_ratings
  FOR SELECT USING (true);

-- Users can insert their own ratings
DROP POLICY IF EXISTS "Users can insert their own ratings" ON app_ratings;
CREATE POLICY "Users can insert their own ratings" ON app_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
DROP POLICY IF EXISTS "Users can update their own ratings" ON app_ratings;
CREATE POLICY "Users can update their own ratings" ON app_ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own ratings
DROP POLICY IF EXISTS "Users can delete their own ratings" ON app_ratings;
CREATE POLICY "Users can delete their own ratings" ON app_ratings
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all ratings (for admin dashboard)
DROP POLICY IF EXISTS "Admins can view all app ratings" ON app_ratings;
CREATE POLICY "Admins can view all app ratings" ON app_ratings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
      AND role = 'super_admin'
    )
  );
