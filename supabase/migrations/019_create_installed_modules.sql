-- Create installed_modules table to track which modules users have installed
CREATE TABLE IF NOT EXISTS installed_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE installed_modules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own installed modules" ON installed_modules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can install modules for themselves" ON installed_modules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own installed modules" ON installed_modules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own installed modules" ON installed_modules
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_installed_modules_user_id ON installed_modules(user_id);
CREATE INDEX IF NOT EXISTS idx_installed_modules_module_id ON installed_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_installed_modules_active ON installed_modules(user_id, is_active) WHERE is_active = true;

-- Create function to update last_accessed timestamp
CREATE OR REPLACE FUNCTION update_module_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_accessed
CREATE TRIGGER trigger_update_module_last_accessed
  BEFORE UPDATE ON installed_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_module_last_accessed();
