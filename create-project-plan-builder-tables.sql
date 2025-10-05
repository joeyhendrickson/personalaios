-- Project Plan Builder Database Schema
-- This creates all necessary tables for the Project Plan Builder app

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Credentials Table (encrypted storage for BYOK)
CREATE TABLE IF NOT EXISTS project_plan_builder_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Google Drive credentials (encrypted)
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_email TEXT,
  google_name TEXT,
  
  -- Pinecone credentials (encrypted)
  pinecone_api_key TEXT,
  pinecone_project_id TEXT,
  
  -- OpenAI credentials (encrypted, optional)
  openai_api_key TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user
  UNIQUE(user_id)
);

-- 2. Analysis Jobs Table
CREATE TABLE IF NOT EXISTS project_plan_builder_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Job metadata
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Client and project info
  client_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  
  -- Google Drive integration
  drive_folder_id TEXT NOT NULL,
  drive_folder_url TEXT NOT NULL,
  
  -- Analysis results
  sufficiency_report JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Generated Plans Table
CREATE TABLE IF NOT EXISTS project_plan_builder_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES project_plan_builder_jobs(id) ON DELETE CASCADE NOT NULL,
  
  -- Plan metadata
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'failed')),
  
  -- Plan content
  content TEXT,
  
  -- File storage (for future PDF/DOCX generation)
  file_path TEXT,
  file_size BIGINT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Knowledge Cards Table (for extracted information)
CREATE TABLE IF NOT EXISTS project_plan_builder_knowledge_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES project_plan_builder_jobs(id) ON DELETE CASCADE NOT NULL,
  
  -- Card metadata
  card_type TEXT NOT NULL CHECK (card_type IN ('requirement', 'constraint', 'decision', 'risk', 'persona', 'term', 'policy')),
  canonical_name TEXT NOT NULL,
  value TEXT NOT NULL,
  
  -- Source information
  source_document TEXT,
  source_chunk_id TEXT,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  
  -- Versioning and conflicts
  version INTEGER DEFAULT 1,
  is_conflict BOOLEAN DEFAULT FALSE,
  conflict_with UUID REFERENCES project_plan_builder_knowledge_cards(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Document Chunks Table (for vector storage metadata)
CREATE TABLE IF NOT EXISTS project_plan_builder_document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES project_plan_builder_jobs(id) ON DELETE CASCADE NOT NULL,
  
  -- Document metadata
  document_name TEXT NOT NULL,
  document_type TEXT,
  document_url TEXT,
  
  -- Chunk information
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_tokens INTEGER,
  
  -- Vector storage
  pinecone_vector_id TEXT,
  embedding_model TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE project_plan_builder_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_plan_builder_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_plan_builder_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_plan_builder_knowledge_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_plan_builder_document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_plan_builder_credentials
CREATE POLICY "Users can view their own credentials" ON project_plan_builder_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials" ON project_plan_builder_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials" ON project_plan_builder_credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials" ON project_plan_builder_credentials
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for project_plan_builder_jobs
CREATE POLICY "Users can view their own jobs" ON project_plan_builder_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON project_plan_builder_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON project_plan_builder_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" ON project_plan_builder_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for project_plan_builder_plans
CREATE POLICY "Users can view their own plans" ON project_plan_builder_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plans" ON project_plan_builder_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans" ON project_plan_builder_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans" ON project_plan_builder_plans
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for project_plan_builder_knowledge_cards
CREATE POLICY "Users can view their own knowledge cards" ON project_plan_builder_knowledge_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knowledge cards" ON project_plan_builder_knowledge_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge cards" ON project_plan_builder_knowledge_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge cards" ON project_plan_builder_knowledge_cards
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for project_plan_builder_document_chunks
CREATE POLICY "Users can view their own document chunks" ON project_plan_builder_document_chunks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document chunks" ON project_plan_builder_document_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document chunks" ON project_plan_builder_document_chunks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document chunks" ON project_plan_builder_document_chunks
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_plan_builder_credentials_user_id ON project_plan_builder_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_project_plan_builder_jobs_user_id ON project_plan_builder_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_project_plan_builder_jobs_status ON project_plan_builder_jobs(status);
CREATE INDEX IF NOT EXISTS idx_project_plan_builder_plans_user_id ON project_plan_builder_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_project_plan_builder_plans_job_id ON project_plan_builder_plans(job_id);
CREATE INDEX IF NOT EXISTS idx_project_plan_builder_knowledge_cards_user_id ON project_plan_builder_knowledge_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_project_plan_builder_knowledge_cards_job_id ON project_plan_builder_knowledge_cards(job_id);
CREATE INDEX IF NOT EXISTS idx_project_plan_builder_knowledge_cards_type ON project_plan_builder_knowledge_cards(card_type);
CREATE INDEX IF NOT EXISTS idx_project_plan_builder_document_chunks_user_id ON project_plan_builder_document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_project_plan_builder_document_chunks_job_id ON project_plan_builder_document_chunks(job_id);

-- Add comments to document the schema
COMMENT ON TABLE project_plan_builder_credentials IS 'Encrypted storage for user credentials (Google Drive, Pinecone, OpenAI)';
COMMENT ON TABLE project_plan_builder_jobs IS 'Analysis jobs for processing Google Drive folders and extracting knowledge';
COMMENT ON TABLE project_plan_builder_plans IS 'Generated project plans from analysis jobs';
COMMENT ON TABLE project_plan_builder_knowledge_cards IS 'Extracted knowledge cards from document analysis';
COMMENT ON TABLE project_plan_builder_document_chunks IS 'Document chunks for vector storage and retrieval';

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_project_plan_builder_credentials_updated_at BEFORE UPDATE ON project_plan_builder_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_plan_builder_jobs_updated_at BEFORE UPDATE ON project_plan_builder_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_plan_builder_plans_updated_at BEFORE UPDATE ON project_plan_builder_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_plan_builder_knowledge_cards_updated_at BEFORE UPDATE ON project_plan_builder_knowledge_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
