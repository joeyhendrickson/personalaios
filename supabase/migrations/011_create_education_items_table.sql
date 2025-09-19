-- Migration: Create education items table for tracking educational goals and certifications
-- This creates the education_items table for tracking educational achievements with points

-- Create education_items table
CREATE TABLE education_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- Will be linked to auth.users
    title VARCHAR(255) NOT NULL,
    description TEXT,
    points_value INTEGER NOT NULL DEFAULT 100,
    cost DECIMAL(10,2), -- Optional cost of the certification/course
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
    priority_level INTEGER DEFAULT 3, -- 1-5 priority scale
    target_date DATE, -- Optional target completion date
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create education_completions table to track when education items are completed
CREATE TABLE education_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    education_item_id UUID NOT NULL REFERENCES education_items(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points_awarded INTEGER NOT NULL,
    notes TEXT, -- Optional notes about completion
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_education_items_user_id ON education_items(user_id);
CREATE INDEX idx_education_items_status ON education_items(status);
CREATE INDEX idx_education_items_active ON education_items(is_active);
CREATE INDEX idx_education_items_priority ON education_items(priority_level);
CREATE INDEX idx_education_completions_user_id ON education_completions(user_id);
CREATE INDEX idx_education_completions_education_item_id ON education_completions(education_item_id);
CREATE INDEX idx_education_completions_completed_at ON education_completions(completed_at);

-- Add RLS policies for education_items table
ALTER TABLE education_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own education items
CREATE POLICY "Users can view their own education items" ON education_items
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own education items
CREATE POLICY "Users can insert their own education items" ON education_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own education items
CREATE POLICY "Users can update their own education items" ON education_items
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own education items
CREATE POLICY "Users can delete their own education items" ON education_items
    FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for education_completions table
ALTER TABLE education_completions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own education completions
CREATE POLICY "Users can view their own education completions" ON education_completions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own education completions
CREATE POLICY "Users can insert their own education completions" ON education_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own education completions
CREATE POLICY "Users can update their own education completions" ON education_completions
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own education completions
CREATE POLICY "Users can delete their own education completions" ON education_completions
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_education_items_updated_at BEFORE UPDATE ON education_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to add points to ledger when education item is completed
CREATE OR REPLACE FUNCTION add_education_completion_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Add points to the points_ledger
    INSERT INTO points_ledger (user_id, points, description, created_at)
    VALUES (
        NEW.user_id, 
        NEW.points_awarded, 
        'Education completed: ' || (SELECT title FROM education_items WHERE id = NEW.education_item_id),
        NEW.completed_at
    );
    
    -- Update the education item status to completed
    UPDATE education_items 
    SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.education_item_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for education completion points
CREATE TRIGGER education_completion_points_trigger 
    AFTER INSERT ON education_completions 
    FOR EACH ROW 
    EXECUTE FUNCTION add_education_completion_points();
