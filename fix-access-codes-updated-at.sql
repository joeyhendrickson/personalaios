-- Fix the access_codes table by adding updated_at column and recreating the trigger

-- Add updated_at column if it doesn't exist
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to set updated_at
UPDATE public.access_codes SET updated_at = created_at WHERE updated_at IS NULL;

-- Drop the existing trigger
DROP TRIGGER IF EXISTS update_access_codes_updated_at ON public.access_codes;

-- Recreate the trigger function (it should already exist, but let's make sure)
CREATE OR REPLACE FUNCTION update_access_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
CREATE TRIGGER update_access_codes_updated_at
    BEFORE UPDATE ON public.access_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_access_codes_updated_at();

-- Verify the changes
SELECT 
    'Access codes table fixed' as status,
    COUNT(*) as total_codes
FROM public.access_codes;

-- Show the columns to confirm updated_at exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'access_codes'
ORDER BY ordinal_position;

