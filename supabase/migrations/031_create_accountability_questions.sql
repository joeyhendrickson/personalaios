-- Migration: Create accountability_questions table for budget analysis discussions
-- This table stores accountability questions from budget analysis and allows users to discuss and complete them

CREATE TABLE IF NOT EXISTS accountability_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_analysis_id UUID, -- Reference to budget_insights.id if needed
    question TEXT NOT NULL,
    category TEXT NOT NULL,
    context TEXT,
    transactions JSONB, -- Array of transactions that contributed to this question
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_discussion', 'completed', 'dismissed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing discussion messages for accountability questions
CREATE TABLE IF NOT EXISTS accountability_question_discussions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    accountability_question_id UUID NOT NULL REFERENCES accountability_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_accountability_questions_user_id ON accountability_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_accountability_questions_status ON accountability_questions(status);
CREATE INDEX IF NOT EXISTS idx_accountability_questions_created_at ON accountability_questions(created_at);
CREATE INDEX IF NOT EXISTS idx_accountability_question_discussions_question_id ON accountability_question_discussions(accountability_question_id);
CREATE INDEX IF NOT EXISTS idx_accountability_question_discussions_user_id ON accountability_question_discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_accountability_question_discussions_created_at ON accountability_question_discussions(created_at);

-- Enable RLS
ALTER TABLE accountability_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_question_discussions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accountability_questions
CREATE POLICY "Users can view their own accountability questions" ON accountability_questions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accountability questions" ON accountability_questions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accountability questions" ON accountability_questions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accountability questions" ON accountability_questions
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for accountability_question_discussions
CREATE POLICY "Users can view discussions for their accountability questions" ON accountability_question_discussions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM accountability_questions 
            WHERE accountability_questions.id = accountability_question_discussions.accountability_question_id 
            AND accountability_questions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert discussions for their accountability questions" ON accountability_question_discussions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM accountability_questions 
            WHERE accountability_questions.id = accountability_question_discussions.accountability_question_id 
            AND accountability_questions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update discussions for their accountability questions" ON accountability_question_discussions
    FOR UPDATE USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM accountability_questions 
            WHERE accountability_questions.id = accountability_question_discussions.accountability_question_id 
            AND accountability_questions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete discussions for their accountability questions" ON accountability_question_discussions
    FOR DELETE USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM accountability_questions 
            WHERE accountability_questions.id = accountability_question_discussions.accountability_question_id 
            AND accountability_questions.user_id = auth.uid()
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_accountability_questions_updated_at 
    BEFORE UPDATE ON accountability_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
