-- Create manual accounts table for user-entered financial accounts
-- This allows users to track accounts not connected via Plaid (e.g., Schwab, loans, IRAs, etc.)

CREATE TABLE IF NOT EXISTS manual_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_name TEXT NOT NULL,
    account_name TEXT, -- Optional: specific account name (e.g., "401k", "Roth IRA")
    account_type TEXT NOT NULL CHECK (account_type IN (
        'investment', -- Stocks, IRAs, 401k, etc.
        'loan', -- Student loans, mortgages, bank loans
        'asset', -- Other assets
        'other' -- Other types
    )),
    amount DECIMAL(15, 2) NOT NULL, -- Positive for assets, negative for debts
    notes TEXT, -- Optional notes about the account
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_manual_accounts_user_id ON manual_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_accounts_account_type ON manual_accounts(account_type);

-- Create updated_at trigger
CREATE TRIGGER update_manual_accounts_updated_at 
    BEFORE UPDATE ON manual_accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE manual_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own manual accounts" 
    ON manual_accounts 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own manual accounts" 
    ON manual_accounts 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manual accounts" 
    ON manual_accounts 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manual accounts" 
    ON manual_accounts 
    FOR DELETE 
    USING (auth.uid() = user_id);

