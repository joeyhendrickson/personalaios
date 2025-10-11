-- Create access_codes table if it doesn't exist
-- This table stores the access codes created by admins for free account setup

CREATE TABLE IF NOT EXISTS public.access_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_email ON public.access_codes(email);
CREATE INDEX IF NOT EXISTS idx_access_codes_expires_at ON public.access_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_access_codes_is_active ON public.access_codes(is_active);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_access_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_access_codes_updated_at ON public.access_codes;
CREATE TRIGGER update_access_codes_updated_at
    BEFORE UPDATE ON public.access_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_access_codes_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage access codes" ON public.access_codes;
DROP POLICY IF EXISTS "Anyone can view active codes" ON public.access_codes;

-- Admins can do everything
CREATE POLICY "Admins can manage access codes" ON public.access_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE email = auth.jwt() ->> 'email' 
            AND is_active = true
        )
    );

-- Anyone can view active, non-expired codes (for verification)
CREATE POLICY "Anyone can view active codes" ON public.access_codes
    FOR SELECT USING (
        is_active = true 
        AND expires_at > NOW()
    );

-- Verify the table was created
SELECT 
    'Access codes table created successfully' as status,
    COUNT(*) as existing_codes
FROM public.access_codes;
