-- SETUP BUDGET OPTIMIZER - Create all required tables
-- Run this in your Supabase SQL Editor

-- 1. Bank Connections Table
CREATE TABLE IF NOT EXISTS bank_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plaid_item_id TEXT NOT NULL UNIQUE,
    plaid_access_token TEXT NOT NULL,
    institution_id TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    official_name TEXT,
    type TEXT NOT NULL,
    subtype TEXT,
    mask TEXT,
    current_balance DECIMAL(12, 2),
    available_balance DECIMAL(12, 2),
    iso_currency_code TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bank_connection_id, account_id)
);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    transaction_id TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    merchant_name TEXT,
    category TEXT[],
    pending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bank_account_id, transaction_id)
);

-- 4. Budget Categories Table  
CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    monthly_budget DECIMAL(12, 2),
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 5. Transaction Categorizations Table
CREATE TABLE IF NOT EXISTS transaction_categorizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    budget_category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
    confidence DECIMAL(3, 2),
    is_manual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_id, budget_category_id)
);

-- 6. Budget Analysis Table
CREATE TABLE IF NOT EXISTS budget_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_period_start DATE NOT NULL,
    analysis_period_end DATE NOT NULL,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bank_connections
DROP POLICY IF EXISTS "Users can view their own bank connections" ON bank_connections;
DROP POLICY IF EXISTS "Users can insert their own bank connections" ON bank_connections;
DROP POLICY IF EXISTS "Users can update their own bank connections" ON bank_connections;
DROP POLICY IF EXISTS "Users can delete their own bank connections" ON bank_connections;

CREATE POLICY "Users can view their own bank connections" ON bank_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bank connections" ON bank_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bank connections" ON bank_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bank connections" ON bank_connections FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for bank_accounts
DROP POLICY IF EXISTS "Users can view their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON bank_accounts;

CREATE POLICY "Users can view their own bank accounts" ON bank_accounts FOR SELECT USING (
    bank_connection_id IN (SELECT id FROM bank_connections WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert their own bank accounts" ON bank_accounts FOR INSERT WITH CHECK (
    bank_connection_id IN (SELECT id FROM bank_connections WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update their own bank accounts" ON bank_accounts FOR UPDATE USING (
    bank_connection_id IN (SELECT id FROM bank_connections WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete their own bank accounts" ON bank_accounts FOR DELETE USING (
    bank_connection_id IN (SELECT id FROM bank_connections WHERE user_id = auth.uid())
);

-- Create RLS policies for transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (
    bank_account_id IN (
        SELECT ba.id FROM bank_accounts ba
        JOIN bank_connections bc ON ba.bank_connection_id = bc.id
        WHERE bc.user_id = auth.uid()
    )
);
CREATE POLICY "Users can insert their own transactions" ON transactions FOR INSERT WITH CHECK (
    bank_account_id IN (
        SELECT ba.id FROM bank_accounts ba
        JOIN bank_connections bc ON ba.bank_connection_id = bc.id
        WHERE bc.user_id = auth.uid()
    )
);
CREATE POLICY "Users can delete their own transactions" ON transactions FOR DELETE USING (
    bank_account_id IN (
        SELECT ba.id FROM bank_accounts ba
        JOIN bank_connections bc ON ba.bank_connection_id = bc.id
        WHERE bc.user_id = auth.uid()
    )
);

-- Create RLS policies for budget_categories
DROP POLICY IF EXISTS "Users can view their own budget categories" ON budget_categories;
DROP POLICY IF EXISTS "Users can insert their own budget categories" ON budget_categories;
DROP POLICY IF EXISTS "Users can update their own budget categories" ON budget_categories;
DROP POLICY IF EXISTS "Users can delete their own budget categories" ON budget_categories;

CREATE POLICY "Users can view their own budget categories" ON budget_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budget categories" ON budget_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budget categories" ON budget_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budget categories" ON budget_categories FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for budget_analyses
DROP POLICY IF EXISTS "Users can view their own budget analyses" ON budget_analyses;
DROP POLICY IF EXISTS "Users can insert their own budget analyses" ON budget_analyses;

CREATE POLICY "Users can view their own budget analyses" ON budget_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budget analyses" ON budget_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_connections_user_id ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection_id ON bank_accounts(bank_connection_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_budget_categories_user_id ON budget_categories(user_id);

-- Success message
SELECT 'BUDGET OPTIMIZER SETUP COMPLETE! All tables have been created.' as result;

