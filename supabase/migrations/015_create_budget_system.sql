-- Create budget system tables
-- This migration creates tables for Plaid integration and budget management

-- Bank connections table
CREATE TABLE IF NOT EXISTS bank_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL, -- Encrypted Plaid access token
    item_id TEXT NOT NULL, -- Plaid item ID
    institution_id TEXT, -- Plaid institution ID
    institution_name TEXT, -- Bank name
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, item_id)
);

-- Bank accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL, -- Plaid account ID
    name TEXT NOT NULL,
    official_name TEXT,
    type TEXT NOT NULL, -- checking, savings, credit, loan, etc.
    subtype TEXT, -- checking, savings, credit_card, etc.
    mask TEXT, -- Last 4 digits
    current_balance DECIMAL(15,2),
    available_balance DECIMAL(15,2),
    iso_currency_code TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bank_connection_id, account_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    transaction_id TEXT NOT NULL, -- Plaid transaction ID
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    datetime TIMESTAMP WITH TIME ZONE,
    name TEXT NOT NULL,
    merchant_name TEXT,
    category TEXT[], -- Array of categories from Plaid
    category_id TEXT,
    subcategory TEXT,
    account_owner TEXT,
    pending BOOLEAN DEFAULT FALSE,
    iso_currency_code TEXT DEFAULT 'USD',
    location JSONB, -- Location data from Plaid
    payment_meta JSONB, -- Payment metadata
    personal_finance_category JSONB, -- Plaid's personal finance category
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bank_account_id, transaction_id)
);

-- Budget categories table
CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'dollar-sign',
    is_income BOOLEAN DEFAULT FALSE,
    is_fixed BOOLEAN DEFAULT FALSE, -- Fixed expenses vs variable
    parent_category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Budget periods table (monthly budgets)
CREATE TABLE IF NOT EXISTS budget_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "January 2024"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_income DECIMAL(15,2) DEFAULT 0,
    total_expenses DECIMAL(15,2) DEFAULT 0,
    total_savings DECIMAL(15,2) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, start_date, end_date)
);

-- Budget allocations table (how much allocated to each category)
CREATE TABLE IF NOT EXISTS budget_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_period_id UUID NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
    allocated_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(budget_period_id, category_id)
);

-- Transaction categorization table (manual overrides)
CREATE TABLE IF NOT EXISTS transaction_categorizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_manual BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_id)
);

-- Budget goals table
CREATE TABLE IF NOT EXISTS budget_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0,
    target_date DATE,
    category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget insights table (AI-generated insights)
CREATE TABLE IF NOT EXISTS budget_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- 'spending_pattern', 'savings_opportunity', 'budget_alert', etc.
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    data JSONB, -- Additional insight data
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bank_connections_user_id ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections(status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection_id ON bank_accounts(bank_connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_type ON bank_accounts(type);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions USING GIN(category);
CREATE INDEX IF NOT EXISTS idx_budget_categories_user_id ON budget_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_periods_user_id ON budget_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_periods_dates ON budget_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_period_id ON budget_allocations(budget_period_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_category_id ON budget_allocations(category_id);
CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_transaction_id ON transaction_categorizations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_category_id ON transaction_categorizations(category_id);
CREATE INDEX IF NOT EXISTS idx_budget_goals_user_id ON budget_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_goals_status ON budget_goals(status);
CREATE INDEX IF NOT EXISTS idx_budget_insights_user_id ON budget_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_insights_type ON budget_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_budget_insights_is_read ON budget_insights(is_read);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bank_connections_updated_at BEFORE UPDATE ON bank_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_categories_updated_at BEFORE UPDATE ON budget_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_periods_updated_at BEFORE UPDATE ON budget_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_allocations_updated_at BEFORE UPDATE ON budget_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transaction_categorizations_updated_at BEFORE UPDATE ON transaction_categorizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_goals_updated_at BEFORE UPDATE ON budget_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_insights_updated_at BEFORE UPDATE ON budget_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own bank connections" ON bank_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bank connections" ON bank_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bank connections" ON bank_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bank connections" ON bank_connections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bank accounts" ON bank_accounts FOR SELECT USING (
    EXISTS (SELECT 1 FROM bank_connections WHERE id = bank_accounts.bank_connection_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert their own bank accounts" ON bank_accounts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM bank_connections WHERE id = bank_accounts.bank_connection_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their own bank accounts" ON bank_accounts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM bank_connections WHERE id = bank_accounts.bank_connection_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their own bank accounts" ON bank_accounts FOR DELETE USING (
    EXISTS (SELECT 1 FROM bank_connections WHERE id = bank_accounts.bank_connection_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM bank_accounts ba 
        JOIN bank_connections bc ON ba.bank_connection_id = bc.id 
        WHERE ba.id = transactions.bank_account_id AND bc.user_id = auth.uid()
    )
);
CREATE POLICY "Users can insert their own transactions" ON transactions FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM bank_accounts ba 
        JOIN bank_connections bc ON ba.bank_connection_id = bc.id 
        WHERE ba.id = transactions.bank_account_id AND bc.user_id = auth.uid()
    )
);
CREATE POLICY "Users can update their own transactions" ON transactions FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM bank_accounts ba 
        JOIN bank_connections bc ON ba.bank_connection_id = bc.id 
        WHERE ba.id = transactions.bank_account_id AND bc.user_id = auth.uid()
    )
);
CREATE POLICY "Users can delete their own transactions" ON transactions FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM bank_accounts ba 
        JOIN bank_connections bc ON ba.bank_connection_id = bc.id 
        WHERE ba.id = transactions.bank_account_id AND bc.user_id = auth.uid()
    )
);

CREATE POLICY "Users can view their own budget categories" ON budget_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budget categories" ON budget_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budget categories" ON budget_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budget categories" ON budget_categories FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own budget periods" ON budget_periods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budget periods" ON budget_periods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budget periods" ON budget_periods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budget periods" ON budget_periods FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own budget allocations" ON budget_allocations FOR SELECT USING (
    EXISTS (SELECT 1 FROM budget_periods WHERE id = budget_allocations.budget_period_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert their own budget allocations" ON budget_allocations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM budget_periods WHERE id = budget_allocations.budget_period_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their own budget allocations" ON budget_allocations FOR UPDATE USING (
    EXISTS (SELECT 1 FROM budget_periods WHERE id = budget_allocations.budget_period_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their own budget allocations" ON budget_allocations FOR DELETE USING (
    EXISTS (SELECT 1 FROM budget_periods WHERE id = budget_allocations.budget_period_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view their own transaction categorizations" ON transaction_categorizations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transaction categorizations" ON transaction_categorizations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transaction categorizations" ON transaction_categorizations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transaction categorizations" ON transaction_categorizations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own budget goals" ON budget_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budget goals" ON budget_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budget goals" ON budget_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budget goals" ON budget_goals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own budget insights" ON budget_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budget insights" ON budget_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budget insights" ON budget_insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budget insights" ON budget_insights FOR DELETE USING (auth.uid() = user_id);

-- Insert default budget categories
INSERT INTO budget_categories (user_id, name, description, color, icon, is_income, is_fixed) VALUES
-- Income categories
('00000000-0000-0000-0000-000000000000', 'Salary', 'Primary income from employment', '#10B981', 'briefcase', true, true),
('00000000-0000-0000-0000-000000000000', 'Freelance', 'Income from freelance work', '#10B981', 'user', true, false),
('00000000-0000-0000-0000-000000000000', 'Investment', 'Income from investments', '#10B981', 'trending-up', true, false),
('00000000-0000-0000-0000-000000000000', 'Other Income', 'Other sources of income', '#10B981', 'dollar-sign', true, false),

-- Fixed expense categories
('00000000-0000-0000-0000-000000000000', 'Housing', 'Rent, mortgage, property taxes', '#EF4444', 'home', false, true),
('00000000-0000-0000-0000-000000000000', 'Utilities', 'Electricity, water, gas, internet', '#EF4444', 'zap', false, true),
('00000000-0000-0000-0000-000000000000', 'Insurance', 'Health, auto, life insurance', '#EF4444', 'shield', false, true),
('00000000-0000-0000-0000-000000000000', 'Loan Payments', 'Student loans, car payments', '#EF4444', 'credit-card', false, true),
('00000000-0000-0000-0000-000000000000', 'Subscriptions', 'Monthly subscriptions and memberships', '#EF4444', 'repeat', false, true),

-- Variable expense categories
('00000000-0000-0000-0000-000000000000', 'Groceries', 'Food and household items', '#F59E0B', 'shopping-cart', false, false),
('00000000-0000-0000-0000-000000000000', 'Dining Out', 'Restaurants and takeout', '#F59E0B', 'utensils', false, false),
('00000000-0000-0000-0000-000000000000', 'Transportation', 'Gas, public transit, rideshare', '#F59E0B', 'car', false, false),
('00000000-0000-0000-0000-000000000000', 'Entertainment', 'Movies, games, hobbies', '#F59E0B', 'gamepad-2', false, false),
('00000000-0000-0000-0000-000000000000', 'Shopping', 'Clothing, electronics, miscellaneous', '#F59E0B', 'shopping-bag', false, false),
('00000000-0000-0000-0000-000000000000', 'Healthcare', 'Medical expenses, prescriptions', '#F59E0B', 'heart', false, false),
('00000000-0000-0000-0000-000000000000', 'Personal Care', 'Grooming, beauty, wellness', '#F59E0B', 'sparkles', false, false),

-- Savings categories
('00000000-0000-0000-0000-000000000000', 'Emergency Fund', 'Emergency savings', '#3B82F6', 'piggy-bank', false, false),
('00000000-0000-0000-0000-000000000000', 'Retirement', '401k, IRA contributions', '#3B82F6', 'trending-up', false, false),
('00000000-0000-0000-0000-000000000000', 'Vacation', 'Travel and vacation savings', '#3B82F6', 'plane', false, false),
('00000000-0000-0000-0000-000000000000', 'Other Savings', 'Other savings goals', '#3B82F6', 'target', false, false);

-- Create a function to get user's default categories (will be used in triggers)
CREATE OR REPLACE FUNCTION get_default_budget_categories(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO budget_categories (user_id, name, description, color, icon, is_income, is_fixed)
    SELECT 
        user_uuid,
        name,
        description,
        color,
        icon,
        is_income,
        is_fixed
    FROM budget_categories 
    WHERE user_id = '00000000-0000-0000-0000-000000000000'
    ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
