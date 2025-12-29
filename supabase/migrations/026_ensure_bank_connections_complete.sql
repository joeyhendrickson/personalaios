-- Ensure bank_connections table exists with all required columns
-- This migration fixes PGRST204 errors by ensuring the table structure is complete

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS bank_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    item_id TEXT NOT NULL,
    institution_id TEXT,
    institution_name TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, item_id)
);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add access_token if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_connections' AND column_name = 'access_token'
    ) THEN
        ALTER TABLE bank_connections ADD COLUMN access_token TEXT NOT NULL DEFAULT '';
        ALTER TABLE bank_connections ALTER COLUMN access_token DROP DEFAULT;
        RAISE NOTICE 'Added access_token column';
    END IF;

    -- Add item_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_connections' AND column_name = 'item_id'
    ) THEN
        ALTER TABLE bank_connections ADD COLUMN item_id TEXT NOT NULL DEFAULT '';
        ALTER TABLE bank_connections ALTER COLUMN item_id DROP DEFAULT;
        RAISE NOTICE 'Added item_id column';
    END IF;

    -- Add institution_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_connections' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE bank_connections ADD COLUMN institution_id TEXT;
        RAISE NOTICE 'Added institution_id column';
    END IF;

    -- Add institution_name if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_connections' AND column_name = 'institution_name'
    ) THEN
        ALTER TABLE bank_connections ADD COLUMN institution_name TEXT;
        RAISE NOTICE 'Added institution_name column';
    END IF;

    -- Add status if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_connections' AND column_name = 'status'
    ) THEN
        ALTER TABLE bank_connections ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected'));
        RAISE NOTICE 'Added status column';
    END IF;

    -- Add last_sync_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_connections' AND column_name = 'last_sync_at'
    ) THEN
        ALTER TABLE bank_connections ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_sync_at column';
    END IF;
END $$;

-- Ensure unique constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'bank_connections_user_id_item_id_key'
    ) THEN
        ALTER TABLE bank_connections 
        ADD CONSTRAINT bank_connections_user_id_item_id_key UNIQUE(user_id, item_id);
        RAISE NOTICE 'Added unique constraint on (user_id, item_id)';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_bank_connections_user_id ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections(status);

-- Enable RLS if not already enabled
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    -- SELECT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bank_connections' 
        AND policyname = 'Users can view their own bank connections'
    ) THEN
        CREATE POLICY "Users can view their own bank connections" 
        ON bank_connections FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    -- INSERT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bank_connections' 
        AND policyname = 'Users can insert their own bank connections'
    ) THEN
        CREATE POLICY "Users can insert their own bank connections" 
        ON bank_connections FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- UPDATE policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bank_connections' 
        AND policyname = 'Users can update their own bank connections'
    ) THEN
        CREATE POLICY "Users can update their own bank connections" 
        ON bank_connections FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;

    -- DELETE policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bank_connections' 
        AND policyname = 'Users can delete their own bank connections'
    ) THEN
        CREATE POLICY "Users can delete their own bank connections" 
        ON bank_connections FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

