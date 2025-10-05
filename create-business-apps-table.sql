-- Create business_apps table for Business Hacks functionality
CREATE TABLE IF NOT EXISTS business_apps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_business_apps_user_id ON business_apps(user_id);
CREATE INDEX IF NOT EXISTS idx_business_apps_active ON business_apps(user_id, is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE business_apps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own business apps" ON business_apps
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business apps" ON business_apps
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business apps" ON business_apps
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business apps" ON business_apps
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_business_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_apps_updated_at
    BEFORE UPDATE ON business_apps
    FOR EACH ROW
    EXECUTE FUNCTION update_business_apps_updated_at();
