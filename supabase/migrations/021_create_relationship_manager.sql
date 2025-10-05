-- Relationship Manager System
-- Migration: 021_create_relationship_manager.sql

-- Create relationship types table
CREATE TABLE IF NOT EXISTS relationship_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default relationship types
INSERT INTO relationship_types (name, description) VALUES
('Family (Close Cultural)', 'Close family members with cultural and emotional connections'),
('Potential Investors (Fundraising)', 'Potential investors for business fundraising'),
('Potential Clients (Sales)', 'Potential clients for sales and business development'),
('Friendships (Social)', 'Social friendships and personal connections'),
('Dating (Romantic)', 'Romantic relationships and dating prospects')
ON CONFLICT (name) DO NOTHING;

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship_type_id UUID NOT NULL REFERENCES relationship_types(id),
    email TEXT,
    phone TEXT,
    zipcode TEXT,
    notes TEXT,
    engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
    last_contact_date TIMESTAMP WITH TIME ZONE,
    preferred_contact_frequency_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contact profiles table for relationship-specific data
CREATE TABLE IF NOT EXISTS contact_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    profile_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create interactions table
CREATE TABLE IF NOT EXISTS interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- 'call', 'text', 'email', 'meeting', 'date', 'event'
    interaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    outcome TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI suggestions table
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    suggestion_type TEXT NOT NULL, -- 'message', 'activity', 'follow_up', 'event'
    suggestion_content TEXT NOT NULL,
    priority_score INTEGER DEFAULT 0 CHECK (priority_score >= 0 AND priority_score <= 100),
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create relationship goals table
CREATE TABLE IF NOT EXISTS relationship_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL, -- 'frequency', 'engagement', 'specific_outcome'
    goal_description TEXT NOT NULL,
    target_value TEXT,
    current_value TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_relationship_type ON contacts(relationship_type_id);
CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(last_contact_date);
CREATE INDEX IF NOT EXISTS idx_interactions_contact_id ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_contact_id ON ai_suggestions(contact_id);
CREATE INDEX IF NOT EXISTS idx_relationship_goals_user_id ON relationship_goals(user_id);

-- Enable RLS
ALTER TABLE relationship_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all relationship types" ON relationship_types FOR SELECT USING (true);

CREATE POLICY "Users can manage their own contacts" ON contacts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own contact profiles" ON contact_profiles
    FOR ALL USING (auth.uid() = (SELECT user_id FROM contacts WHERE id = contact_id));

CREATE POLICY "Users can manage their own interactions" ON interactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own AI suggestions" ON ai_suggestions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own relationship goals" ON relationship_goals
    FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_profiles_updated_at BEFORE UPDATE ON contact_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationship_goals_updated_at BEFORE UPDATE ON relationship_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


