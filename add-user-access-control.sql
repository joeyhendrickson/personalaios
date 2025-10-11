-- Add user access control to profiles table
-- This allows admins to enable/disable user access to the platform

-- Add access_enabled column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS access_enabled BOOLEAN DEFAULT true;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing profiles to have access_enabled = true (default)
UPDATE public.profiles 
SET access_enabled = true, updated_at = NOW()
WHERE access_enabled IS NULL;

-- Verify the changes
SELECT 
    'Profiles table updated' as status,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN access_enabled = true THEN 1 END) as enabled_profiles,
    COUNT(CASE WHEN access_enabled = false THEN 1 END) as disabled_profiles
FROM public.profiles;
