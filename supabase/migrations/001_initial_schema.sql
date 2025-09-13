-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE goal_category AS ENUM ('health', 'productivity', 'learning', 'financial', 'personal', 'other');
CREATE TYPE task_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE ledger_type AS ENUM ('points', 'money');

-- Create weeks table
CREATE TABLE weeks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_start, week_end)
);

-- Create weekly_goals table
CREATE TABLE weekly_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Will be linked to auth.users
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category goal_category NOT NULL DEFAULT 'other',
    target_points INTEGER NOT NULL DEFAULT 0,
    target_money DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    current_points INTEGER NOT NULL DEFAULT 0,
    current_money DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    weekly_goal_id UUID NOT NULL REFERENCES weekly_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Will be linked to auth.users
    title VARCHAR(255) NOT NULL,
    description TEXT,
    points_value INTEGER NOT NULL DEFAULT 0,
    money_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status task_status NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure every task must reference a goal
    CONSTRAINT tasks_must_have_goal CHECK (weekly_goal_id IS NOT NULL)
);

-- Create points_ledger table
CREATE TABLE points_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- Will be linked to auth.users
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    weekly_goal_id UUID REFERENCES weekly_goals(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create money_ledger table
CREATE TABLE money_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- Will be linked to auth.users
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    weekly_goal_id UUID REFERENCES weekly_goals(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_weekly_goals_user_id ON weekly_goals(user_id);
CREATE INDEX idx_weekly_goals_week_id ON weekly_goals(week_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_weekly_goal_id ON tasks(weekly_goal_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_points_ledger_user_id ON points_ledger(user_id);
CREATE INDEX idx_money_ledger_user_id ON money_ledger(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_weeks_updated_at BEFORE UPDATE ON weeks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weekly_goals_updated_at BEFORE UPDATE ON weekly_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update goal progress when task is completed
CREATE OR REPLACE FUNCTION update_goal_progress_on_task_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger on status change to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Update the weekly goal's current points and money
        UPDATE weekly_goals 
        SET 
            current_points = current_points + NEW.points_value,
            current_money = current_money + NEW.money_value,
            updated_at = NOW()
        WHERE id = NEW.weekly_goal_id;
        
        -- Set completed_at timestamp
        NEW.completed_at = NOW();
        
        -- Insert into points ledger
        INSERT INTO points_ledger (user_id, task_id, weekly_goal_id, points, description)
        VALUES (NEW.user_id, NEW.id, NEW.weekly_goal_id, NEW.points_value, 'Task completed: ' || NEW.title);
        
        -- Insert into money ledger if money_value > 0
        IF NEW.money_value > 0 THEN
            INSERT INTO money_ledger (user_id, task_id, weekly_goal_id, amount, description)
            VALUES (NEW.user_id, NEW.id, NEW.weekly_goal_id, NEW.money_value, 'Task completed: ' || NEW.title);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for task completion
CREATE TRIGGER task_completion_trigger 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_goal_progress_on_task_completion();

-- Enable Row Level Security (RLS)
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_ledger ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (will be updated when auth is properly set up)
-- For now, allow all operations for authenticated users
CREATE POLICY "Users can view their own data" ON weekly_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own data" ON weekly_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own data" ON weekly_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own data" ON weekly_goals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own points ledger" ON points_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own points ledger" ON points_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own money ledger" ON money_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own money ledger" ON money_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow all users to view weeks (they're not user-specific)
CREATE POLICY "Anyone can view weeks" ON weeks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert weeks" ON weeks FOR INSERT WITH CHECK (true);
