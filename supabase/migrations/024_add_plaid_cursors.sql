-- Add Plaid cursors table for incremental transaction syncing
-- This table stores sync cursors for each Plaid item to enable efficient incremental updates

-- Plaid cursors table
CREATE TABLE IF NOT EXISTS plaid_cursors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL, -- Plaid item ID
    cursor TEXT, -- Plaid sync cursor for incremental updates
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plaid_cursors_user_id ON plaid_cursors(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_cursors_item_id ON plaid_cursors(item_id);

-- Create updated_at trigger
CREATE TRIGGER update_plaid_cursors_updated_at 
    BEFORE UPDATE ON plaid_cursors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE plaid_cursors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (deny by default, allow users to read their own)
CREATE POLICY "Users can view their own Plaid cursors" 
    ON plaid_cursors 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Plaid cursors" 
    ON plaid_cursors 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Plaid cursors" 
    ON plaid_cursors 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Plaid cursors" 
    ON plaid_cursors 
    FOR DELETE 
    USING (auth.uid() = user_id);

