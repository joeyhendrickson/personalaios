-- Migration: Create budget_goals table for income and budget reduction goals from Budget Optimizer
-- These goals will appear as recommendations on the dashboard

CREATE TABLE IF NOT EXISTS budget_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    goal_category VARCHAR(50) NOT NULL CHECK (goal_category IN ('income', 'budget_reduction')),
    target_value DECIMAL(15,2),
    target_unit VARCHAR(50) DEFAULT 'dollars',
    priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    start_date DATE,
    target_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    is_added_to_dashboard BOOLEAN DEFAULT FALSE,
    added_to_dashboard_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE budget_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own budget goals" ON budget_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget goals" ON budget_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget goals" ON budget_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget goals" ON budget_goals
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_budget_goals_user_id ON budget_goals(user_id);
CREATE INDEX idx_budget_goals_status ON budget_goals(status);
CREATE INDEX idx_budget_goals_category ON budget_goals(goal_category);
CREATE INDEX idx_budget_goals_added_to_dashboard ON budget_goals(is_added_to_dashboard);

-- Create trigger for updated_at
CREATE TRIGGER update_budget_goals_updated_at 
    BEFORE UPDATE ON budget_goals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

