-- Create bug reports and feature requests system
-- This creates a comprehensive system for users to report bugs and suggest features

-- Table for bug reports and feature requests
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT, -- URL to uploaded screenshot
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'closed')),
  admin_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for bug_reports
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own bug_reports" ON bug_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bug_reports" ON bug_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all bug_reports" ON bug_reports FOR SELECT USING (
  auth.uid() = 'your-admin-user-id-here' -- Replace with actual admin user ID
);
CREATE POLICY "Admins can update all bug_reports" ON bug_reports FOR UPDATE USING (
  auth.uid() = 'your-admin-user-id-here' -- Replace with actual admin user ID
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_type ON bug_reports(type);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON bug_reports
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
