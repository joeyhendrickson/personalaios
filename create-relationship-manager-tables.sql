-- Create relationship manager tables
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  relationship_type VARCHAR(100) NOT NULL, -- family, friend, colleague, business, etc.
  last_contact_date DATE,
  contact_frequency_days INTEGER DEFAULT 30, -- How often to contact them
  notes TEXT,
  priority_level INTEGER DEFAULT 3 CHECK (priority_level >= 1 AND priority_level <= 5),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create photos table for storing Google Photos metadata
CREATE TABLE IF NOT EXISTS relationship_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE NOT NULL,
  google_photo_id VARCHAR(500) UNIQUE NOT NULL,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  photo_date DATE,
  location TEXT,
  description TEXT,
  people_in_photo TEXT[], -- Array of names/faces detected
  ai_tags TEXT[], -- AI-generated tags about activities, emotions, etc.
  relevance_score DECIMAL(3,2) DEFAULT 0.50, -- 0.00 to 1.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contact history table
CREATE TABLE IF NOT EXISTS contact_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE NOT NULL,
  contact_type VARCHAR(50) NOT NULL, -- call, text, email, meeting, social_media
  contact_method VARCHAR(100), -- phone number, email address, platform
  message_content TEXT,
  was_initiated_by_me BOOLEAN DEFAULT true,
  duration_minutes INTEGER, -- for calls/meetings
  outcome TEXT, -- what was discussed, planned, etc.
  next_follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI message templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
  template_type VARCHAR(50) NOT NULL, -- casual, birthday, holiday, check_in, follow_up
  context TEXT, -- what the message is about
  base_template TEXT NOT NULL,
  ai_generated BOOLEAN DEFAULT false,
  personalization_data JSONB, -- data used to personalize the message
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_relationships_user_id ON relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_last_contact ON relationships(last_contact_date);
CREATE INDEX IF NOT EXISTS idx_relationships_priority ON relationships(priority_level);
CREATE INDEX IF NOT EXISTS idx_photos_relationship_id ON relationship_photos(relationship_id);
CREATE INDEX IF NOT EXISTS idx_photos_google_id ON relationship_photos(google_photo_id);
CREATE INDEX IF NOT EXISTS idx_photos_relevance ON relationship_photos(relevance_score);
CREATE INDEX IF NOT EXISTS idx_contact_history_relationship ON contact_history(relationship_id);
CREATE INDEX IF NOT EXISTS idx_contact_history_date ON contact_history(created_at);
CREATE INDEX IF NOT EXISTS idx_message_templates_relationship ON message_templates(relationship_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_relationships_updated_at ON relationships;
CREATE TRIGGER trigger_update_relationships_updated_at
  BEFORE UPDATE ON relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_relationships_updated_at();

DROP TRIGGER IF EXISTS trigger_update_photos_updated_at ON relationship_photos;
CREATE TRIGGER trigger_update_photos_updated_at
  BEFORE UPDATE ON relationship_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_photos_updated_at();

DROP TRIGGER IF EXISTS trigger_update_templates_updated_at ON message_templates;
CREATE TRIGGER trigger_update_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_templates_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Relationships policies
DROP POLICY IF EXISTS "Users can view their own relationships" ON relationships;
CREATE POLICY "Users can view their own relationships" ON relationships
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own relationships" ON relationships;
CREATE POLICY "Users can insert their own relationships" ON relationships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own relationships" ON relationships;
CREATE POLICY "Users can update their own relationships" ON relationships
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own relationships" ON relationships;
CREATE POLICY "Users can delete their own relationships" ON relationships
  FOR DELETE USING (auth.uid() = user_id);

-- Photos policies
DROP POLICY IF EXISTS "Users can view their own photos" ON relationship_photos;
CREATE POLICY "Users can view their own photos" ON relationship_photos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own photos" ON relationship_photos;
CREATE POLICY "Users can insert their own photos" ON relationship_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own photos" ON relationship_photos;
CREATE POLICY "Users can update their own photos" ON relationship_photos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own photos" ON relationship_photos;
CREATE POLICY "Users can delete their own photos" ON relationship_photos
  FOR DELETE USING (auth.uid() = user_id);

-- Contact history policies
DROP POLICY IF EXISTS "Users can view their own contact history" ON contact_history;
CREATE POLICY "Users can view their own contact history" ON contact_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own contact history" ON contact_history;
CREATE POLICY "Users can insert their own contact history" ON contact_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own contact history" ON contact_history;
CREATE POLICY "Users can update their own contact history" ON contact_history
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own contact history" ON contact_history;
CREATE POLICY "Users can delete their own contact history" ON contact_history
  FOR DELETE USING (auth.uid() = user_id);

-- Message templates policies
DROP POLICY IF EXISTS "Users can view their own templates" ON message_templates;
CREATE POLICY "Users can view their own templates" ON message_templates
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own templates" ON message_templates;
CREATE POLICY "Users can insert their own templates" ON message_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own templates" ON message_templates;
CREATE POLICY "Users can update their own templates" ON message_templates
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own templates" ON message_templates;
CREATE POLICY "Users can delete their own templates" ON message_templates
  FOR DELETE USING (auth.uid() = user_id);
