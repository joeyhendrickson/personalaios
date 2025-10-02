-- Apply all missing migrations
-- Run this in your Supabase SQL Editor

-- 1. Create goals table for high-level goals
CREATE TABLE IF NOT EXISTS goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL DEFAULT 'weekly',
    target_value DECIMAL(10,2),
    target_unit VARCHAR(50),
    current_value DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    priority_level INTEGER DEFAULT 3 CHECK (priority_level >= 1 AND priority_level <= 5),
    start_date DATE,
    target_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create priorities table
CREATE TABLE IF NOT EXISTS priorities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority_type VARCHAR(20) NOT NULL DEFAULT 'manual',
    priority_score INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_priority ON goals(priority_level);
CREATE INDEX IF NOT EXISTS idx_priorities_user_id ON priorities(user_id);
CREATE INDEX IF NOT EXISTS idx_priorities_type ON priorities(priority_type);
CREATE INDEX IF NOT EXISTS idx_priorities_completed ON priorities(is_completed);
CREATE INDEX IF NOT EXISTS idx_priorities_order ON priorities(order_index);

-- 4. Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for goals
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
CREATE POLICY "Users can view their own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
CREATE POLICY "Users can insert their own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
CREATE POLICY "Users can update their own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;
CREATE POLICY "Users can delete their own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Create RLS policies for priorities
DROP POLICY IF EXISTS "Users can view their own priorities" ON priorities;
CREATE POLICY "Users can view their own priorities" ON priorities
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own priorities" ON priorities;
CREATE POLICY "Users can insert their own priorities" ON priorities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own priorities" ON priorities;
CREATE POLICY "Users can update their own priorities" ON priorities
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own priorities" ON priorities;
CREATE POLICY "Users can delete their own priorities" ON priorities
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Verify tables were created
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('goals', 'priorities');



