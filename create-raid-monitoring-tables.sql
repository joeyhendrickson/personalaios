-- RAID Monitoring Tool Database Schema
-- This creates all necessary tables for the RAID Monitoring Tool

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. RAID Analysis Jobs Table
CREATE TABLE IF NOT EXISTS raid_monitoring_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Job metadata
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,
  
  -- Client and project info
  client_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  
  -- Google Drive integration
  drive_folder_id TEXT NOT NULL,
  drive_folder_url TEXT NOT NULL,
  
  -- Analysis results summary
  summary JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. RAID Entries Table
CREATE TABLE IF NOT EXISTS raid_monitoring_entries (
  id TEXT PRIMARY KEY, -- Format: raid:user:client:project:type:slug:vN
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES raid_monitoring_jobs(id) ON DELETE CASCADE NOT NULL,
  
  -- RAID item metadata
  type TEXT NOT NULL CHECK (type IN ('Risk', 'Assumption', 'Issue', 'Dependency')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Scoring and assessment
  impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5),
  likelihood INTEGER NOT NULL CHECK (likelihood >= 1 AND likelihood <= 5),
  urgency INTEGER NOT NULL CHECK (urgency >= 1 AND urgency <= 3),
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.8 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  priority_score INTEGER GENERATED ALWAYS AS (impact * likelihood * urgency * confidence * 100) STORED,
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  
  -- Management fields
  blocker BOOLEAN DEFAULT FALSE,
  owner TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  
  -- Fire detection
  is_fire BOOLEAN DEFAULT FALSE,
  fire_reason TEXT,
  fire_status TEXT CHECK (fire_status IN ('Unacknowledged', 'Acknowledged', 'Mitigating', 'Contained', 'Resolved')),
  
  -- Source tracking
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Versioning and change tracking
  version INTEGER DEFAULT 1,
  hash TEXT, -- For duplicate detection
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fire Events Table
CREATE TABLE IF NOT EXISTS raid_monitoring_fires (
  id TEXT PRIMARY KEY, -- Format: fire:client:project:raidId:timestamp
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES raid_monitoring_jobs(id) ON DELETE CASCADE NOT NULL,
  raid_id TEXT REFERENCES raid_monitoring_entries(id) ON DELETE CASCADE NOT NULL,
  
  -- Fire metadata
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trigger_rule TEXT NOT NULL,
  priority_score INTEGER NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  
  -- Actions and status
  next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Unacknowledged' CHECK (status IN ('Unacknowledged', 'Acknowledged', 'Mitigating', 'Contained', 'Resolved')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE raid_monitoring_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_monitoring_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_monitoring_fires ENABLE ROW LEVEL SECURITY;

-- RLS Policies for raid_monitoring_jobs
CREATE POLICY "Users can view their own RAID jobs" ON raid_monitoring_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own RAID jobs" ON raid_monitoring_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RAID jobs" ON raid_monitoring_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own RAID jobs" ON raid_monitoring_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for raid_monitoring_entries
CREATE POLICY "Users can view their own RAID entries" ON raid_monitoring_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own RAID entries" ON raid_monitoring_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RAID entries" ON raid_monitoring_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own RAID entries" ON raid_monitoring_entries
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for raid_monitoring_fires
CREATE POLICY "Users can view their own fire events" ON raid_monitoring_fires
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fire events" ON raid_monitoring_fires
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fire events" ON raid_monitoring_fires
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fire events" ON raid_monitoring_fires
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_jobs_user_id ON raid_monitoring_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_jobs_status ON raid_monitoring_jobs(status);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_jobs_created_at ON raid_monitoring_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_raid_monitoring_entries_user_id ON raid_monitoring_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_entries_job_id ON raid_monitoring_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_entries_type ON raid_monitoring_entries(type);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_entries_severity ON raid_monitoring_entries(severity);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_entries_status ON raid_monitoring_entries(status);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_entries_is_fire ON raid_monitoring_entries(is_fire);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_entries_priority_score ON raid_monitoring_entries(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_entries_due_date ON raid_monitoring_entries(due_date);

CREATE INDEX IF NOT EXISTS idx_raid_monitoring_fires_user_id ON raid_monitoring_fires(user_id);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_fires_job_id ON raid_monitoring_fires(job_id);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_fires_raid_id ON raid_monitoring_fires(raid_id);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_fires_status ON raid_monitoring_fires(status);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_fires_severity ON raid_monitoring_fires(severity);
CREATE INDEX IF NOT EXISTS idx_raid_monitoring_fires_triggered_at ON raid_monitoring_fires(triggered_at DESC);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_raid_entries_user_type_severity ON raid_monitoring_entries(user_id, type, severity);
CREATE INDEX IF NOT EXISTS idx_raid_entries_user_fire_status ON raid_monitoring_entries(user_id, is_fire, status);
CREATE INDEX IF NOT EXISTS idx_fires_user_status_severity ON raid_monitoring_fires(user_id, status, severity);

-- Add comments to document the schema
COMMENT ON TABLE raid_monitoring_jobs IS 'RAID analysis jobs for processing Google Drive folders and extracting RAID items';
COMMENT ON TABLE raid_monitoring_entries IS 'Individual RAID items (Risks, Assumptions, Issues, Dependencies) with scoring and fire detection';
COMMENT ON TABLE raid_monitoring_fires IS 'Fire events triggered by high-priority RAID items requiring immediate attention';

COMMENT ON COLUMN raid_monitoring_entries.priority_score IS 'Calculated as impact * likelihood * urgency * confidence * 100';
COMMENT ON COLUMN raid_monitoring_entries.severity IS 'Derived from priority score: Low (1-25), Medium (26-50), High (51-75), Critical (76-100)';
COMMENT ON COLUMN raid_monitoring_entries.sources IS 'JSON array of source documents with excerpts';
COMMENT ON COLUMN raid_monitoring_fires.next_actions IS 'JSON array of recommended actions for fire mitigation';

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_raid_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_raid_monitoring_jobs_updated_at BEFORE UPDATE ON raid_monitoring_jobs FOR EACH ROW EXECUTE FUNCTION update_raid_updated_at_column();
CREATE TRIGGER update_raid_monitoring_entries_updated_at BEFORE UPDATE ON raid_monitoring_entries FOR EACH ROW EXECUTE FUNCTION update_raid_updated_at_column();
CREATE TRIGGER update_raid_monitoring_fires_updated_at BEFORE UPDATE ON raid_monitoring_fires FOR EACH ROW EXECUTE FUNCTION update_raid_updated_at_column();

-- Create a function to automatically calculate severity based on priority score
CREATE OR REPLACE FUNCTION calculate_raid_severity(priority_score INTEGER)
RETURNS TEXT AS $$
BEGIN
    CASE 
        WHEN priority_score >= 76 THEN RETURN 'Critical';
        WHEN priority_score >= 51 THEN RETURN 'High';
        WHEN priority_score >= 26 THEN RETURN 'Medium';
        ELSE RETURN 'Low';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create a function to automatically detect fires based on RAID entry criteria
CREATE OR REPLACE FUNCTION detect_raid_fire(
    p_type TEXT,
    p_impact INTEGER,
    p_likelihood INTEGER,
    p_priority_score INTEGER,
    p_blocker BOOLEAN,
    p_due_date DATE,
    p_status TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Risk fire detection
    IF p_type = 'Risk' AND (p_impact >= 4 AND p_likelihood >= 4 OR p_priority_score >= 60) THEN
        RETURN TRUE;
    END IF;
    
    -- Issue fire detection
    IF p_type = 'Issue' AND (p_blocker = TRUE OR (p_due_date < CURRENT_DATE AND p_status != 'Resolved')) THEN
        RETURN TRUE;
    END IF;
    
    -- Dependency fire detection
    IF p_type = 'Dependency' AND p_blocker = TRUE AND p_priority_score >= 45 THEN
        RETURN TRUE;
    END IF;
    
    -- Assumption fire detection (validation expired)
    IF p_type = 'Assumption' AND p_due_date < CURRENT_DATE AND p_status != 'Resolved' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update severity and fire detection
CREATE OR REPLACE FUNCTION update_raid_entry_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update severity based on priority score
    NEW.severity = calculate_raid_severity(NEW.priority_score);
    
    -- Update fire detection
    NEW.is_fire = detect_raid_fire(
        NEW.type,
        NEW.impact,
        NEW.likelihood,
        NEW.priority_score,
        NEW.blocker,
        NEW.due_date,
        NEW.status
    );
    
    -- Set fire reason
    IF NEW.is_fire THEN
        CASE 
            WHEN NEW.type = 'Risk' AND NEW.impact >= 4 AND NEW.likelihood >= 4 THEN
                NEW.fire_reason = 'High impact and likelihood';
            WHEN NEW.type = 'Risk' AND NEW.priority_score >= 60 THEN
                NEW.fire_reason = 'High priority score';
            WHEN NEW.type = 'Issue' AND NEW.blocker = TRUE THEN
                NEW.fire_reason = 'Blocker issue';
            WHEN NEW.type = 'Issue' AND NEW.due_date < CURRENT_DATE THEN
                NEW.fire_reason = 'Overdue issue';
            WHEN NEW.type = 'Dependency' AND NEW.blocker = TRUE THEN
                NEW.fire_reason = 'Blocking dependency';
            WHEN NEW.type = 'Assumption' AND NEW.due_date < CURRENT_DATE THEN
                NEW.fire_reason = 'Expired assumption';
            ELSE
                NEW.fire_reason = 'High priority';
        END CASE;
        
        -- Set fire status if not already set
        IF NEW.fire_status IS NULL THEN
            NEW.fire_status = 'Unacknowledged';
        END IF;
    ELSE
        -- Clear fire-related fields if not a fire
        NEW.fire_reason = NULL;
        NEW.fire_status = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_raid_entry_metadata
    BEFORE INSERT OR UPDATE ON raid_monitoring_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_raid_entry_metadata();
