-- Create Fitbit integration system
-- This migration creates tables for Fitbit OAuth, data sync, and health metrics

-- Fitbit OAuth tokens and user connections
CREATE TABLE IF NOT EXISTS fitbit_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fitbit_user_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scope TEXT[], -- Array of granted scopes
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, fitbit_user_id)
);

-- Sleep data from Fitbit
CREATE TABLE IF NOT EXISTS fitbit_sleep_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fitbit_connection_id UUID NOT NULL REFERENCES fitbit_connections(id) ON DELETE CASCADE,
    sleep_date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    efficiency_percentage DECIMAL(5,2),
    minutes_asleep INTEGER,
    minutes_awake INTEGER,
    minutes_rem INTEGER,
    minutes_light INTEGER,
    minutes_deep INTEGER,
    awakenings_count INTEGER,
    restless_count INTEGER,
    restless_duration INTEGER,
    time_in_bed INTEGER,
    sleep_score INTEGER, -- Fitbit sleep score (0-100)
    raw_data JSONB, -- Store complete Fitbit response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, sleep_date)
);

-- Heart rate data from Fitbit
CREATE TABLE IF NOT EXISTS fitbit_heart_rate_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fitbit_connection_id UUID NOT NULL REFERENCES fitbit_connections(id) ON DELETE CASCADE,
    measurement_date DATE NOT NULL,
    resting_heart_rate INTEGER,
    heart_rate_zones JSONB, -- Store heart rate zones data
    intraday_data JSONB, -- Store minute-by-minute heart rate data
    raw_data JSONB, -- Store complete Fitbit response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, measurement_date)
);

-- Activity data from Fitbit
CREATE TABLE IF NOT EXISTS fitbit_activity_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fitbit_connection_id UUID NOT NULL REFERENCES fitbit_connections(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    steps INTEGER,
    distance_miles DECIMAL(8,3),
    calories_burned INTEGER,
    active_minutes INTEGER,
    sedentary_minutes INTEGER,
    lightly_active_minutes INTEGER,
    fairly_active_minutes INTEGER,
    very_active_minutes INTEGER,
    floors_climbed INTEGER,
    elevation_gained DECIMAL(8,2),
    raw_data JSONB, -- Store complete Fitbit response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fitbit_connections_user_id ON fitbit_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_fitbit_connections_fitbit_user_id ON fitbit_connections(fitbit_user_id);
CREATE INDEX IF NOT EXISTS idx_fitbit_sleep_user_id ON fitbit_sleep_data(user_id);
CREATE INDEX IF NOT EXISTS idx_fitbit_sleep_date ON fitbit_sleep_data(sleep_date);
CREATE INDEX IF NOT EXISTS idx_fitbit_heart_rate_user_id ON fitbit_heart_rate_data(user_id);
CREATE INDEX IF NOT EXISTS idx_fitbit_heart_rate_date ON fitbit_heart_rate_data(measurement_date);
CREATE INDEX IF NOT EXISTS idx_fitbit_activity_user_id ON fitbit_activity_data(user_id);
CREATE INDEX IF NOT EXISTS idx_fitbit_activity_date ON fitbit_activity_data(activity_date);

-- Create updated_at triggers
CREATE TRIGGER update_fitbit_connections_updated_at BEFORE UPDATE ON fitbit_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fitbit_sleep_data_updated_at BEFORE UPDATE ON fitbit_sleep_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fitbit_heart_rate_data_updated_at BEFORE UPDATE ON fitbit_heart_rate_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fitbit_activity_data_updated_at BEFORE UPDATE ON fitbit_activity_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE fitbit_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitbit_sleep_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitbit_heart_rate_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitbit_activity_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own fitbit connections" ON fitbit_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitbit connections" ON fitbit_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitbit connections" ON fitbit_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitbit connections" ON fitbit_connections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own fitbit sleep data" ON fitbit_sleep_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitbit sleep data" ON fitbit_sleep_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitbit sleep data" ON fitbit_sleep_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitbit sleep data" ON fitbit_sleep_data FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own fitbit heart rate data" ON fitbit_heart_rate_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitbit heart rate data" ON fitbit_heart_rate_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitbit heart rate data" ON fitbit_heart_rate_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitbit heart rate data" ON fitbit_heart_rate_data FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own fitbit activity data" ON fitbit_activity_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fitbit activity data" ON fitbit_activity_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fitbit activity data" ON fitbit_activity_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fitbit activity data" ON fitbit_activity_data FOR DELETE USING (auth.uid() = user_id);
