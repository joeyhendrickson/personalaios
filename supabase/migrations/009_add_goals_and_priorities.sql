-- Migration: Add Goals and Priorities tables
-- This creates the foundation for goal-driven prioritization system

-- Create goals table for high-level weekly/monthly goals
CREATE TABLE IF NOT EXISTS goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    target_value DECIMAL(15,2), -- For financial goals, etc.
    target_unit VARCHAR(50), -- 'dollars', 'hours', 'items', etc.
    current_value DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5), -- 1 = highest priority
    start_date DATE,
    target_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create priorities table for AI-recommended and manual priorities
CREATE TABLE IF NOT EXISTS priorities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority_type VARCHAR(20) NOT NULL CHECK (priority_type IN ('ai_recommended', 'manual', 'fire_auto')),
    source_type VARCHAR(20) CHECK (source_type IN ('goal', 'project', 'task', 'manual')),
    source_id UUID, -- References the goal/project/task that generated this priority
    goal_id UUID REFERENCES goals(id) ON DELETE CASCADE, -- Which goal this priority supports
    project_id UUID REFERENCES weekly_goals(id) ON DELETE CASCADE, -- Which project this relates to
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE, -- Which task this relates to
    priority_score DECIMAL(5,2) DEFAULT 0, -- AI-calculated priority score
    manual_order INTEGER, -- For manual reordering
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for goals
CREATE POLICY "Users can view their own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON goals FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for priorities
CREATE POLICY "Users can view their own priorities" ON priorities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own priorities" ON priorities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own priorities" ON priorities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own priorities" ON priorities FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_goal_type ON goals(goal_type);
CREATE INDEX idx_goals_priority_level ON goals(priority_level);

CREATE INDEX idx_priorities_user_id ON priorities(user_id);
CREATE INDEX idx_priorities_priority_type ON priorities(priority_type);
CREATE INDEX idx_priorities_goal_id ON priorities(goal_id);
CREATE INDEX idx_priorities_project_id ON priorities(project_id);
CREATE INDEX idx_priorities_task_id ON priorities(task_id);
CREATE INDEX idx_priorities_manual_order ON priorities(manual_order);
CREATE INDEX idx_priorities_is_completed ON priorities(is_completed);

-- Create triggers for updated_at
CREATE TRIGGER update_goals_updated_at 
    BEFORE UPDATE ON goals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_priorities_updated_at 
    BEFORE UPDATE ON priorities 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();



