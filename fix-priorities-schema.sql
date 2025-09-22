-- Fix priorities table schema
-- Add project_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'priorities' 
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE priorities ADD COLUMN project_id UUID REFERENCES goals(id) ON DELETE CASCADE;
    END IF;
END $$;

