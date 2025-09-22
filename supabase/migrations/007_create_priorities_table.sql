-- Migration: Create priorities table for AI-recommended and manual priorities
-- This creates the priorities table for the priorities section

-- Create priorities table
CREATE TABLE priorities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- Will be linked to auth.users
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority_type VARCHAR(20) NOT NULL DEFAULT 'manual', -- manual, ai_recommended, fire_auto
    priority_score INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_priorities_user_id ON priorities(user_id);
CREATE INDEX idx_priorities_type ON priorities(priority_type);
CREATE INDEX idx_priorities_completed ON priorities(is_completed);
CREATE INDEX idx_priorities_order ON priorities(order_index);

-- Add RLS policies for priorities table
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own priorities
CREATE POLICY "Users can view their own priorities" ON priorities
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own priorities
CREATE POLICY "Users can insert their own priorities" ON priorities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own priorities
CREATE POLICY "Users can update their own priorities" ON priorities
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own priorities
CREATE POLICY "Users can delete their own priorities" ON priorities
    FOR DELETE USING (auth.uid() = user_id);


