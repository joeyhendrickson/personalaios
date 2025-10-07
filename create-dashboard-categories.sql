-- Create dashboard categories system
-- This allows users to create, edit, and organize their own dashboard sections

-- Table for user dashboard categories
CREATE TABLE IF NOT EXISTS dashboard_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6', -- Hex color code
  icon_name VARCHAR(50), -- Lucide icon name
  sort_order INT NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE, -- True for system-provided categories
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- RLS for dashboard_categories
ALTER TABLE dashboard_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own dashboard_categories" ON dashboard_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own dashboard_categories" ON dashboard_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own dashboard_categories" ON dashboard_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own dashboard_categories" ON dashboard_categories FOR DELETE USING (auth.uid() = user_id);

-- Table for category content associations
CREATE TABLE IF NOT EXISTS category_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES dashboard_categories(id) ON DELETE CASCADE NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'goals', 'tasks', 'habits', 'education', 'priorities', 'projects', 'accomplishments'
  content_id UUID NOT NULL, -- ID of the specific item
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, content_type, content_id)
);

-- RLS for category_content
ALTER TABLE category_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own category_content" ON category_content FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own category_content" ON category_content FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own category_content" ON category_content FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own category_content" ON category_content FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboard_categories_user_id ON dashboard_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_categories_sort_order ON dashboard_categories(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_category_content_user_id ON category_content(user_id);
CREATE INDEX IF NOT EXISTS idx_category_content_category_id ON category_content(category_id);
CREATE INDEX IF NOT EXISTS idx_category_content_type ON category_content(content_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_dashboard_categories_updated_at
BEFORE UPDATE ON dashboard_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_content_updated_at
BEFORE UPDATE ON category_content
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories for new users
-- This function will be called when a user signs up
CREATE OR REPLACE FUNCTION create_default_dashboard_categories(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO dashboard_categories (user_id, name, description, color, icon_name, sort_order, is_default) VALUES
  (user_uuid, 'Goals', 'Measurable things I really need to achieve in my life right now', '#3B82F6', 'Target', 1, TRUE),
  (user_uuid, 'Priorities', 'AI-recommended priorities I should do now', '#10B981', 'Zap', 2, TRUE),
  (user_uuid, 'Projects', 'Tracking my progress on big ideas and things I''m doing to reach my goals', '#8B5CF6', 'FolderOpen', 3, TRUE),
  (user_uuid, 'Tasks', 'Breaking down my projects into actionable items', '#F59E0B', 'CheckSquare', 4, TRUE),
  (user_uuid, 'Education', 'Things I''m learning or certificates I''m completing', '#EF4444', 'BookOpen', 5, TRUE),
  (user_uuid, 'Daily Habits', 'Do these things every day and earn points', '#06B6D4', 'Repeat', 6, TRUE),
  (user_uuid, 'AI Advisor', 'Help me organize my life and get things done', '#84CC16', 'Brain', 7, TRUE);
END;
$$ LANGUAGE plpgsql;
