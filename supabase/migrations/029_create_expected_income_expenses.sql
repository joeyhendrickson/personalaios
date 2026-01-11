-- Create expected income and expenses tables for budget planning
-- These tables track expected income and expenses that users plan for budgeting

-- Expected Income Table
CREATE TABLE IF NOT EXISTS expected_income (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- e.g., "job", "client account", "real estate", "dividends"
    amount DECIMAL(15, 2) NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'one-time')),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expected Expenses Table (aligned with TurboTax business expense categories)
CREATE TABLE IF NOT EXISTS expected_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- Common business expense categories
    amount DECIMAL(15, 2) NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'one-time')),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expected_income_user_id ON expected_income(user_id);
CREATE INDEX IF NOT EXISTS idx_expected_income_active ON expected_income(is_active);
CREATE INDEX IF NOT EXISTS idx_expected_expenses_user_id ON expected_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expected_expenses_category ON expected_expenses(category);
CREATE INDEX IF NOT EXISTS idx_expected_expenses_active ON expected_expenses(is_active);

-- Create updated_at triggers
CREATE TRIGGER update_expected_income_updated_at 
    BEFORE UPDATE ON expected_income 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expected_expenses_updated_at 
    BEFORE UPDATE ON expected_expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE expected_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expected_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expected_income
CREATE POLICY "Users can view their own expected income" 
    ON expected_income 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expected income" 
    ON expected_income 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expected income" 
    ON expected_income 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expected income" 
    ON expected_income 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Create RLS policies for expected_expenses
CREATE POLICY "Users can view their own expected expenses" 
    ON expected_expenses 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expected expenses" 
    ON expected_expenses 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expected expenses" 
    ON expected_expenses 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expected expenses" 
    ON expected_expenses 
    FOR DELETE 
    USING (auth.uid() = user_id);

