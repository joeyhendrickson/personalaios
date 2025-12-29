-- Ensure bank_connections table has access_token column
-- This migration fixes the PGRST204 error by ensuring the column exists

-- Add access_token column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bank_connections' 
        AND column_name = 'access_token'
    ) THEN
        ALTER TABLE bank_connections 
        ADD COLUMN access_token TEXT NOT NULL DEFAULT '';
        
        -- Remove default after adding (we want it to be required)
        ALTER TABLE bank_connections 
        ALTER COLUMN access_token DROP DEFAULT;
        
        RAISE NOTICE 'Added access_token column to bank_connections table';
    ELSE
        RAISE NOTICE 'access_token column already exists in bank_connections table';
    END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

