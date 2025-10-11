-- Add usage limits to access codes
-- This allows admins to set how many times a code can be used

-- Drop the trigger first to avoid conflicts
DROP TRIGGER IF EXISTS update_access_codes_updated_at ON public.access_codes;

-- Add max_uses column to access_codes table
ALTER TABLE public.access_codes 
ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT NULL;

-- Add used_count column to track current usage
ALTER TABLE public.access_codes 
ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;

-- Update existing codes to have unlimited uses (NULL = unlimited)
UPDATE public.access_codes 
SET max_uses = NULL, used_count = 0
WHERE max_uses IS NULL;

-- Add constraint to ensure used_count doesn't exceed max_uses
ALTER TABLE public.access_codes 
ADD CONSTRAINT check_usage_limit 
CHECK (max_uses IS NULL OR used_count <= max_uses);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_access_codes_max_uses ON public.access_codes(max_uses);
CREATE INDEX IF NOT EXISTS idx_access_codes_used_count ON public.access_codes(used_count);

-- Recreate the trigger after adding columns
CREATE TRIGGER update_access_codes_updated_at
    BEFORE UPDATE ON public.access_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_access_codes_updated_at();

-- Verify the changes
SELECT 
    'Access codes usage limits added successfully' as status,
    COUNT(*) as total_codes,
    COUNT(CASE WHEN max_uses IS NULL THEN 1 END) as unlimited_codes,
    COUNT(CASE WHEN max_uses IS NOT NULL THEN 1 END) as limited_codes,
    COUNT(CASE WHEN used_count > 0 THEN 1 END) as used_codes
FROM public.access_codes;
