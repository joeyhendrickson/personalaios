-- Create transaction_rules table
-- This table stores user-defined rules for categorizing and displaying transactions

CREATE TABLE IF NOT EXISTS transaction_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL, -- Transaction name or keyword to match
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer')),
    category_type TEXT NOT NULL CHECK (category_type IN ('personal', 'business')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique keyword per user
    UNIQUE(user_id, keyword)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transaction_rules_user_id ON transaction_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_rules_keyword ON transaction_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_transaction_rules_active ON transaction_rules(user_id, is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE transaction_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own transaction rules"
    ON transaction_rules
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction rules"
    ON transaction_rules
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transaction rules"
    ON transaction_rules
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transaction rules"
    ON transaction_rules
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transaction_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_transaction_rules_updated_at
    BEFORE UPDATE ON transaction_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_rules_updated_at();
